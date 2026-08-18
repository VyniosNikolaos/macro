//! Outbound capabilities required by the harness domain.

use agent_session::domain::model::AgentSessionId;
use agent_session::domain::ports::AgentConnector;
use bot_id::BotId;
use bots::domain::models::AgentConfig;

use super::error::Result;
use super::model::{SessionAnnouncement, SpawnContainer};

#[cfg(test)]
mod test;

/// Reads what a persona runs: its harness, model, instructions and repository.
///
/// The `bot_agent_config` table belongs to the `bots` crate, so the adapter
/// behind this port goes through that crate rather than issuing its own SQL.
pub trait PersonaConfig: Send + Sync + 'static {
    /// The configuration for a bot, or `None` when it has no agent config.
    fn get(&self, bot_id: BotId) -> impl Future<Output = Result<Option<AgentConfig>>> + Send;
}

/// Posts a pointer to a new agent session into its originating thread.
pub trait SessionAnnouncer: Send + Sync + 'static {
    /// Publish one session announcement.
    fn announce(
        &self,
        announcement: SessionAnnouncement,
    ) -> impl Future<Output = Result<()>> + Send;
}

/// Provisions the container transports agent sessions run through.
pub trait ContainerManager: Send + Sync + 'static {
    /// Transport returned by this provider.
    type Transport: AgentConnector + Clone;

    /// Boot a new container for a session that has never had one.
    fn spawn(
        &self,
        command: SpawnContainer,
    ) -> impl Future<Output = Result<Self::Transport>> + Send;

    /// Reattach to a session's existing container, starting it if stopped.
    fn resume(
        &self,
        session: AgentSessionId,
    ) -> impl Future<Output = Result<Self::Transport>> + Send;

    /// Destroy a session's container for good.
    ///
    /// Unlike the idle reaper, which stops a sandbox so it can be resumed,
    /// this is the end of the session: nothing will reattach. A session with
    /// no container is already in the state this asks for, so it succeeds.
    fn teardown(&self, session: AgentSessionId) -> impl Future<Output = Result<()>> + Send;
}
