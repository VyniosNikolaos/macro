//! Translate `macro.agent_sessions` events into harness commands.
//!
//! The trigger service already did the hard part - watching the channel
//! firehose, matching mentions to sessions, dropping the bot's own messages -
//! so this adapter only routes: is this an open or a forward? Pure
//! translation, no IO; the consumer loop lives in the service binary.
//!
//! Every agent-backed bot is served by this one deployment. It used to filter
//! events down to a single configured bot id, which personas made untenable:
//! a team can mint any number of them, and each would otherwise need its own
//! deployment to be answered at all.

use agent_session::domain::model::AgentSessionId;
use agent_trigger::domain::broker_events::{
    AgentTriggerTopicEvent, ChannelEventMetadata, ExistingAgentSessionEvent, NewAgentSessionEvent,
};

use crate::domain::model::{
    AnnounceOrigin, DeliverAction, HarnessCommand, MentionOrigin, OpenSession,
};

#[cfg(test)]
mod test;

/// Why an event yielded no command. Only for logging - none of these are
/// errors, and the consumer commits the offset either way.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Skipped {
    /// The sender is not a user, so there is nobody to own the session.
    NotFromUser,
    /// An event shape this harness does not recognise yet - the trigger's
    /// vocabulary is non-exhaustive on purpose, and unknown shapes are
    /// skipped rather than wedging the partition.
    Unrecognized,
}

/// Route one trigger event into a harness command, or a reason it was skipped.
pub fn agent_trigger_to_harness_command(
    event: AgentTriggerTopicEvent,
) -> Result<(AgentSessionId, HarnessCommand), Skipped> {
    match event {
        AgentTriggerTopicEvent::New(NewAgentSessionEvent::TopLevelMentioned(mentioned)) => {
            let message = mentioned.message;
            let sender = message
                .sender
                .as_user()
                .cloned()
                .ok_or(Skipped::NotFromUser)?;
            Ok((
                AgentSessionId::new(),
                HarnessCommand::Open(OpenSession {
                    bot_id: mentioned.bot_id,
                    origin: MentionOrigin {
                        channel_id: message.channel_id,
                        // A top-level mention roots its own thread; a mention
                        // inside a thread answers into that thread.
                        thread_id: message.thread_id.unwrap_or(message.message_id),
                        message_id: message.message_id,
                        sender,
                        content: message.content,
                    },
                }),
            ))
        }
        AgentTriggerTopicEvent::Existing(ExistingAgentSessionEvent::Channel(
            ChannelEventMetadata {
                bot_id: _,
                session_id,
                message,
            },
        )) => Ok((
            session_id,
            HarnessCommand::Deliver(DeliverAction::prompt(
                message.content,
                message.sender.as_user().cloned(),
                Some(AnnounceOrigin {
                    channel_id: message.channel_id,
                    thread_id: message.thread_id.unwrap_or(message.message_id),
                }),
            )),
        )),
        _ => Err(Skipped::Unrecognized),
    }
}
