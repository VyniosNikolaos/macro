//! Outbound adapters: the concrete providers, stores, and carriers the domain
//! ports are satisfied by.

pub mod channel_announcer;
pub mod daytona;
pub(crate) mod managed_containers;
pub mod namespace;
pub mod persona_config;
pub(crate) mod provision;
pub(crate) mod session_env;
pub mod sidecar;
