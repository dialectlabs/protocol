//! Dialect is a Solana program for on-chain messaging between addresses.
//!
//! Dialect uses the publish-subscribe messaging pattern. In this case, Dialect "decorates" a resource on chain with messaging capabilities. It does this by creating a "Dialect" - or a message thread - as a PDA whose seeds are an address, or (sorted) set of addresses. E.g. for one-on-one messaging between two wallets, the Dialect PDA's seeds would be the two participatns' wallet addresses, sorted alphabetically.
//!
//! The entrypoints and data structures below implement the one-on-one messaging thread use case, as well as associated authentication and management of such threads.

use anchor_lang::prelude::*;
use solana_program::entrypoint::ProgramResult;

declare_id!("CeNUxGUsSeb5RuAGvaMLNx3tEZrpBwQqA7Gs99vMPCAb");

/// The dialect module contains all entrypoint functions for interacting with dialects.
#[program]
pub mod dialect {

    use super::*;

    // User metadata

    /// This function creates a metadata account for the signing user.
    ///
    /// ### Arguments
    ///
    /// * ctx: The context.
    /// * _metadata_nonce: The seed associated with the metadata account.
    ///
    /// See the CreateMetadata context & MetadataAccount structs below for more information.
    pub fn create_metadata(ctx: Context<CreateMetadata>, _metadata_nonce: u8) -> ProgramResult {
        let metadata_loader = &ctx.accounts.metadata;
        let metadata = &mut metadata_loader.load_init()?;
        metadata.user = ctx.accounts.user.key();
        metadata.subscriptions = [Subscription::default(); 32];
        // Emit an event for monitoring services.
        emit!(MetadataCreatedEvent {
            metadata: metadata_loader.key(),
            user: ctx.accounts.user.key()
        });

        Ok(())
    }

    /// This function closes a metadata account and recovers its rent for the signing user, who must be the metadata account owner.
    ///
    /// * ctx: The context.
    /// * _metadata_nonce: The seed associated with the metadata account.
    ///
    /// See the CloseMetadata context & MetadataAccount structs below for more information.
    pub fn close_metadata(ctx: Context<CloseMetadata>, _metadata_nonce: u8) -> ProgramResult {
        let metadata_loader = &ctx.accounts.metadata;
        let metadata = metadata_loader.load()?;
        // Emit an event for monitoring services.
        emit!(MetadataDeletedEvent {
            metadata: metadata_loader.key(),
            user: metadata.user,
        });

        Ok(())
    }

    // Dialects

    /// This function creates a dialect account for one-on-one messaging between two users.
    ///
    /// ### Arguments
    ///
    /// * dialect_nonce: The nonce for the Dialect account.
    /// * encrypted: Whether or not to encrypt the dialect.
    /// * scopes: The scopes for the dialect's members, implicitly ordered.
    ///
    /// See the CreateDialect context & DialectAccount structs below for more information.
    pub fn create_dialect(
        ctx: Context<CreateDialect>,
        _dialect_nonce: u8,
        encrypted: bool,
        scopes: [[bool; 2]; 2],
    ) -> ProgramResult {
        let dialect_loader = &ctx.accounts.dialect;
        let mut dialect = dialect_loader.load_init()?;
        let _owner = &mut ctx.accounts.owner;
        let members = [&mut ctx.accounts.member0, &mut ctx.accounts.member1];

        dialect.members = [
            Member {
                public_key: *members[0].key,
                scopes: scopes[0],
            },
            Member {
                public_key: *members[1].key,
                scopes: scopes[1],
            },
        ];
        let now = Clock::get()?.unix_timestamp as u32;
        dialect.messages.read_offset = 0;
        dialect.messages.write_offset = 0;
        dialect.messages.items_count = 0;
        dialect.last_message_timestamp = now;
        dialect.encrypted = encrypted;

        emit!(DialectCreatedEvent {
            dialect: dialect_loader.key(),
            members: [*members[0].key, *members[1].key],
        });

        Ok(())
    }

    /// This function closes a dialect account and recovers its rent for the signing user,
    /// who must be the dialect account owner.
    ///
    /// ### Arguments
    ///
    /// * ctx: The context.
    /// * _dialect_nonce: The seed associated with the dialect account.
    ///
    /// See the CloseDialect context & DialectAccount structs below for more information.
    pub fn close_dialect(ctx: Context<CloseDialect>, _dialect_nonce: u8) -> ProgramResult {
        let dialect_loader = &ctx.accounts.dialect;
        let dialect = dialect_loader.load()?;

        emit!(DialectDeletedEvent {
            dialect: dialect_loader.key(),
            members: [dialect.members[0].public_key, dialect.members[1].public_key],
        });

        Ok(())
    }

    /// This function subscribes a user to a dialect by adding the dialect's public key to
    /// the subscriptions in the user's metadata account.
    ///
    /// ### Arguments
    ///
    /// * ctx: The context.
    /// * _dialect_nonce: The seed associated with the dialect account.
    /// * _metadata_nonce: The seed associated with the metadata account.
    ///
    /// See the SubscribeUser context, DialectAccount & MetadataAccount structs below for
    /// more information.
    pub fn subscribe_user(
        ctx: Context<SubscribeUser>,
        _dialect_nonce: u8,
        _metadata_nonce: u8,
    ) -> ProgramResult {
        let dialect = &mut ctx.accounts.dialect;
        let metadata_loader = &mut ctx.accounts.metadata;
        let metadata = &mut metadata_loader.load_mut()?;
        let num_subscriptions = metadata
            .subscriptions
            .iter()
            .filter(|s| is_present(s))
            .count();
        if num_subscriptions < 32 {
            metadata.subscriptions[num_subscriptions] = Subscription {
                pubkey: dialect.key(),
                enabled: true,
            };
            // Emit an event for monitoring services.
            emit!(UserSubscribedEvent {
                metadata: metadata_loader.key(),
                dialect: dialect.key()
            });
        } else {
            // Handle max subscriptions
            msg!("User already subscribed to 32 dialects");
        }
        Ok(())
    }

    /// This function lets a member of a dialect with write privileges send a message in the dialect.
    ///
    /// ### Arguments
    ///
    /// * ctx: The context.
    /// * _dialect_nonce: The seed associated with the dialect account.
    /// * text: The message to send, encoded in u8 vec.
    ///
    /// See the SendMessage context & DialectAccount structs below for more information.
    pub fn send_message(
        ctx: Context<SendMessage>,
        _dialect_nonce: u8,
        text: Vec<u8>,
    ) -> ProgramResult {
        let dialect_loader = &ctx.accounts.dialect;
        let mut dialect = dialect_loader.load_mut()?;
        let sender = &mut ctx.accounts.sender.to_account_info();
        dialect.append(text, sender);
        // Emit an event for monitoring services.
        emit!(MessageSentEvent {
            dialect: dialect_loader.key(),
            sender: *sender.key,
        });
        Ok(())
    }
}

// Contexts

/// Context to create a metadata account for a user, created by the user.
#[derive(Accounts)]
pub struct CreateMetadata<'info> {
    // The metadata owner and the signer for this transaction.
    #[account(mut)]
    pub user: Signer<'info>,
    // The metadata account being created
    #[account(
        init,
        seeds = [
            b"metadata".as_ref(),
            user.key.as_ref(),
        ],
        bump,
        payer = user,
        // discriminator (8) + user + 32 x (subscription) = 1096
        space = 8 + 32 + (32 * 33),
    )]
    pub metadata: AccountLoader<'info, MetadataAccount>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

/// Context to close a metadata account and recover its rent. This action is permanent, and all data is lost.
///
/// Only the owner of a metadata account can close it.
#[derive(Accounts)]
#[instruction(metadata_nonce: u8)]
pub struct CloseMetadata<'info> {
    // The metadata owner and the signer for this transaction.
    #[account(mut)]
    pub user: Signer<'info>,
    // The metadata account being closed.
    #[account(
        mut,
        close = user,
        // The user closing the metadata account must be its owner.
        seeds = [
            b"metadata".as_ref(),
            user.key.as_ref(),
        ],
        has_one = user, // TODO: Does seeds address this, is this redundant?
        bump = metadata_nonce,
    )]
    pub metadata: AccountLoader<'info, MetadataAccount>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

/// Context for subscribing a user to a dialect, which adds the dialect's address to the user's
/// metadata's list of subscriptions.
#[derive(Accounts)]
#[instruction(dialect_nonce: u8, metadata_nonce: u8)] // metadata0_nonce: u8, metadata1_nonce: u8)]
pub struct SubscribeUser<'info> {
    // The signing key, a.k.a. the user taking action to subscribe the other user to a new dialect.
    #[account(mut)]
    pub signer: Signer<'info>,
    /// CHECK: N.b. we do not enforce that user is the signer. Meaning, users can subscribe other users
    // to dialects.
    pub user: AccountInfo<'info>,
    // The metadata account belonging to the user, & to whose subscriptions the dialect will be added.
    #[account(
        mut,
        // Enforce the same constraint on the metadata account to ensure it belongs to the user.
        seeds = [
            b"metadata".as_ref(),
            user.key().as_ref(),
        ],
        bump = metadata_nonce,
        // Enforce no duplicate subscriptions.
        constraint = metadata
            .load()?
            .subscriptions
            .iter()
            .filter(|s| s.pubkey == dialect.key())
            .count() < 1
    )]
    pub metadata: AccountLoader<'info, MetadataAccount>,
    pub dialect: AccountLoader<'info, DialectAccount>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

/// Context for creating a new dialect for one-on-one messaging. The owner deposits the rent,
/// must be one of the members, and has special privileges for e.g. closing a dialect and
/// recovering the deposited rent.
#[derive(Accounts)]
#[instruction(dialect_nonce: u8)]
pub struct CreateDialect<'info> {
    #[account(mut)] // mut is needed because they're the payer for PDA initialization
    // We dupe the owner in one of the members, since the members must be sorted
    pub owner: Signer<'info>,
    /// CHECK: First member, alphabetically
    pub member0: AccountInfo<'info>,
    /// CHECK: Second member, alphabetically
    pub member1: AccountInfo<'info>,
    // Support more users in this or other dialect struct
    #[account(
        init,
        // The dialect's PDA is determined by its members' public keys, sorted alphabetically
        seeds = [
            b"dialect".as_ref(),
            member0.key().as_ref(),
            member1.key().as_ref(),
        ],
        // TODO: Assert that owner is a member with admin privileges
        // Assert that the members are sorted alphabetically, & unique
        constraint = member0.key().cmp(&member1.key()) == std::cmp::Ordering::Less,
        bump,
        payer = owner,
        // NB: max space for PDA = 10240
        // space = discriminator + dialect account size
        space = 8 + 68 + (2 + 2 + 2 + 8192) + 4 + 1
    )]
    pub dialect: AccountLoader<'info, DialectAccount>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

/// Context for closing a dialect account and recovering the rent. Only the owning user who
/// created the dialect can close it.
#[derive(Accounts)]
#[instruction(dialect_nonce: u8)]
pub struct CloseDialect<'info> {
    // The owner, who originally created the dialect.
    #[account(
        mut,
        constraint = dialect.load()?.members.iter().filter(|m| m.public_key == *owner.key && m.scopes[0]).count() > 0,
    )]
    pub owner: Signer<'info>,
    // The dialect account being closed.
    #[account(
        mut,
        close = owner,
        seeds = [
            b"dialect".as_ref(),
            dialect.load()?.members[0].public_key.as_ref(),
            dialect.load()?.members[1].public_key.as_ref(),
        ],
        bump = dialect_nonce,
    )]
    pub dialect: AccountLoader<'info, DialectAccount>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

/// Context for sending a message in a dialect. Only a member with write privileges can send messages.
#[derive(Accounts)]
#[instruction(dialect_nonce: u8)]
pub struct SendMessage<'info> {
    // The signer. Must also be the message sender.
    #[account(
        mut,
        // The sender must be a member with write privileges.
        constraint = dialect.load()?.members.iter().filter(|m| m.public_key == *sender.key && m.scopes[1]).count() > 0,
    )]
    pub sender: Signer<'info>,
    // The dialect in which the message is being sent.
    #[account(
        mut,
        seeds = [
            b"dialect".as_ref(),
            dialect.load()?.members[0].public_key.as_ref(),
            dialect.load()?.members[1].public_key.as_ref(),
        ],
        bump = dialect_nonce,
    )]
    pub dialect: AccountLoader<'info, DialectAccount>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
}

// Accounts

/// The MetadataAccount is an account that holds metadata about a user, who is likely a wallet.
///
/// For now, this metadata includes:
///
/// 1. A reference back to the user's account via their pubkey.
/// 2. The user's subscriptions, which are a list of dialect PDAs.
///
/// The MetadataAccount will be expanded in the future to account for more information about the user.
#[account(zero_copy)]
#[derive(Default)]
pub struct MetadataAccount {
    /// Backward reference to the user's account with which this metadata is associated.
    user: Pubkey, // 32
    /// A list of dialects the user has subscribed to.
    subscriptions: [Subscription; 32], // 32 * space(Subscription)
}

const MESSAGE_BUFFER_LENGTH: usize = 8192;
const ITEM_METADATA_OVERHEAD: u16 = 2;

/// The DialectAccount is the main account for creating messaging.
///
/// The DialectAccount stores
///
/// 1. references to the dialect's members and their scopes (currently two members for one-on-one messaging),
/// 2. its messages, which are stored in a CyclicByteBuffer (see below),
/// 3. the time stamp of the last message sent in the dialect, and
/// 4. whether or not the dialect is encrypted.
#[account(zero_copy)]
// zero_copy used to use repr(packed) rather than its new default, repr(C), so
// we need to explicitly use repr(packed) here to maintain backwards
// compatibility with old dialect accounts.
#[repr(packed)]
/// NB: max space for PDA = 10240
/// space = 8 + 68 + (2 + 2 + 2 + 8192) + 4 + 1
pub struct DialectAccount {
    /// The Dialect members. See the Member struct below
    pub members: [Member; 2], // 2 * Member = 68
    /// The dalect's messages. See the CyclicByteButffer below
    pub messages: CyclicByteBuffer, // 2 + 2 + 2 + 8192
    /// The last message timestamp, for convenience, it should always match the timestamp of the last message sent, or if there are no messages yet the timestamp of the dialect's creation.
    pub last_message_timestamp: u32, // 4, UTC seconds, max value = Sunday, February 7, 2106 6:28:15 AM
    /// A bool representing whether or not the dialect is encrypted.
    pub encrypted: bool, // 1
}

impl DialectAccount {
    /// Append another message to the dialect's messages. See the CyclicByteBuffer for more information on implementation.
    ///
    /// Arguments
    ///
    /// * text: The message to append, encoded in u8.
    /// * sender: The sender of the message, as a generic AccountInfo.
    fn append(&mut self, text: Vec<u8>, sender: &mut AccountInfo) {
        let now = Clock::get().unwrap().unix_timestamp as u32;
        self.last_message_timestamp = now;
        let sender_member_idx = self
            .members
            .iter()
            .position(|m| m.public_key == *sender.key)
            .unwrap() as u8;
        let mut serialized_message = Vec::new();
        serialized_message.extend(sender_member_idx.to_be_bytes().into_iter());
        serialized_message.extend(now.to_be_bytes().into_iter());
        serialized_message.extend(text);
        self.messages.append(serialized_message)
    }
}

/// A special data structure that is used to efficiently store arbitrary length byte arrays.
/// Maintains FIFO attributes on top of cyclic buffer.
/// Ensures there's a space to append new item by erasing old items, if no space available.
#[zero_copy]
// space = 2 + 2 + 2 + 8192
pub struct CyclicByteBuffer {
    /// Offset of first item in [buffer].
    pub read_offset: u16, // 2
    /// Offset of next item in [buffer].
    pub write_offset: u16, // 2
    /// Current number of items in [buffer].
    pub items_count: u16, // 2
    /// Underlying bytebuffer, stores items.
    pub buffer: [u8; 8192], // 8192
}

impl CyclicByteBuffer {
    /// Appends an arbitrary length item passed in the parameter to the end of the buffer.
    /// If the buffer has no space for insertion, it returns removes old items until there's enough space.
    ///
    /// ### Arguments
    ///
    /// * item: an bytebuffer/bytearray to be appended.
    fn append(&mut self, item: Vec<u8>) {
        let item_with_metadata = &mut Vec::new();
        let item_len = (item.len() as u16).to_be_bytes();
        item_with_metadata.extend(item_len.into_iter());
        item_with_metadata.extend(item);

        let new_write_offset: u16 = self.mod_(self.write_offset + item_with_metadata.len() as u16);
        while self.no_space_available_for(item_with_metadata.len() as u16) {
            self.erase_oldest_item()
        }
        self.write_new_item(item_with_metadata, new_write_offset);
    }

    /// Returns a number by modulo of buffer length.
    ///
    /// Used to re-calculate offset within cyclic buffer structure w/o moving out of buffer boundaries.
    ///
    /// ### Arguments
    ///
    /// * value: an offset/position to be re-calculated.
    fn mod_(&mut self, value: u16) -> u16 {
        value % MESSAGE_BUFFER_LENGTH as u16
    }

    /// Returns true if there's no free space to append item of size [item_size] to buffer.
    ///
    /// Used to re-calculate offset within cyclic buffer structure w/o moving out of buffer boundaries.
    ///
    /// ### Arguments
    ///
    /// * item_size: a size of an item that is added to buffer.
    fn no_space_available_for(&mut self, item_size: u16) -> bool {
        self.get_available_space() < item_size
    }

    /// Returns the amount of available free space.
    fn get_available_space(&mut self) -> u16 {
        if self.items_count == 0 {
            return MESSAGE_BUFFER_LENGTH as u16;
        }
        self.mod_(MESSAGE_BUFFER_LENGTH as u16 + self.read_offset - self.write_offset)
    }

    /// Erases the oldest item from buffer by zeroing and recalculating [read_offset] and [items_count].
    fn erase_oldest_item(&mut self) {
        let item_size = ITEM_METADATA_OVERHEAD + self.read_item_size();
        let zeros = &mut vec![0u8; item_size as usize];
        self.write(zeros, self.read_offset);
        self.read_offset = self.mod_(self.read_offset + item_size);
        self.items_count -= 1;
    }

    /// Returns the size of the item that is present in buffer at [read_offset] position.
    fn read_item_size(&mut self) -> u16 {
        let read_offset = self.read_offset;
        let tail_size = MESSAGE_BUFFER_LENGTH as u16 - read_offset;
        if tail_size >= ITEM_METADATA_OVERHEAD {
            return u16::from_be_bytes([
                self.buffer[read_offset as usize],
                self.buffer[read_offset as usize + 1],
            ]);
        }
        u16::from_be_bytes([self.buffer[read_offset as usize], self.buffer[0]])
    }

    /// Performs writing of [item] to buffer at [write_offset] position.
    ///
    /// ### Arguments
    ///
    /// * item: an bytebuffer/bytearray to be written at [write_offset] position.
    /// * new_write_offset: a new [write_offset] to be set after writing.
    fn write_new_item(&mut self, item: &mut Vec<u8>, new_write_offset: u16) {
        self.write(item, self.write_offset);
        self.write_offset = new_write_offset;
        self.items_count += 1;
    }

    /// Performs writing of [item] to buffer at [offset] position.
    ///
    /// Maintains cyclic structure by writing bytes at positions by calculating position by modulo of buffer size.
    ///
    /// ### Arguments
    ///
    /// * item: an bytebuffer/bytearray to be written at [offset] position.
    /// * offset: an [offset] where to write item.
    fn write(&mut self, item: &mut Vec<u8>, offset: u16) {
        for (idx, e) in item.iter().enumerate() {
            let pos = self.mod_(offset + idx as u16);
            self.buffer[pos as usize] = *e;
        }
    }

    /// Returns an underlying [buffer] that contains all items.
    fn _raw(&mut self) -> [u8; MESSAGE_BUFFER_LENGTH] {
        self.buffer
    }
}

// Data

/// A subscription used to store information about which dialect accounts user is subscribed to.
///
/// Multiple subscriptions can be stored in user's metadata account.
#[zero_copy]
#[derive(Default)]
// space = 33
pub struct Subscription {
    /// Address of dialect account subscribed to.
    pub pubkey: Pubkey, // 32
    /// A switcher to enable/disable subscription.
    pub enabled: bool, // 1
}

/// User who can exchange messages using a dialect account.
#[zero_copy]
#[derive(Default)]
// space = 34
pub struct Member {
    /// User public key.
    pub public_key: Pubkey, // 32
    /// Flags that are used to support basic RBAC authorization to dialect account.
    /// - When ```scopes[0]``` is set to true, the user is granted admin role.
    /// - When ```scopes[1]``` is set to true, the user is granted writer role.
    /// ```
    /// // Examples
    /// scopes: [true, true] // allows to administer account + read messages + write messages
    /// scopes: [false, true] // allows to read messages + write messages
    /// scopes: [false, false] // allows to read messages
    /// ```
    pub scopes: [bool; 2], // 2
}

/// An event that is fired new dialect account is created.
#[event]
pub struct DialectCreatedEvent {
    /// Address of newly created dialect account.
    pub dialect: Pubkey,
    /// A list of dialect members: two users who exchange messages using single dialect account.
    pub members: [Pubkey; 2],
}

// Events

/// An event that is fired when some user sends message to dialect account.
#[event]
pub struct DialectDeletedEvent {
    /// Address of deleted dialect account.
    pub dialect: Pubkey,
    /// A list of dialect members: two users who exchange messages using single dialect account.
    pub members: [Pubkey; 2],
}

#[event]
pub struct MessageSentEvent {
    /// Address of dialect account where messaging happens.
    pub dialect: Pubkey,
    /// User that sent a message.
    pub sender: Pubkey,
}

/// An event that is fired when the metadata account owner is subscribed to dialect.
#[event]
pub struct UserSubscribedEvent {
    /// Address of owner metadata account, where subscription to dialect is stored.
    pub metadata: Pubkey,
    /// Address of dialect account to which user was subscribed.
    pub dialect: Pubkey,
}

/// An event that is fired when new metadata account is created.
#[event]
pub struct MetadataCreatedEvent {
    /// Address of metadata account.
    pub metadata: Pubkey,
    /// Owner of metadata account.
    pub user: Pubkey,
}

/// An event that is fired when new metadata account is deleted.
#[event]
pub struct MetadataDeletedEvent {
    /// Address of deleted metadata account.
    pub metadata: Pubkey,
    /// Owner of metadata account.
    pub user: Pubkey,
}

// Helper functions

/// This function simply checks whether an entry in the metadata account subscriptions
/// array is empty or not. Empty values are encoded with the default public key value.
/// If the entry is a default public key, it is empty, and therefore is_present is false.
///
/// ### Arguments
///
/// * subscription: a pointer to a Subscription, which is the entry being checked.
pub fn is_present(subscription: &Subscription) -> bool {
    subscription.pubkey != Pubkey::default()
}

#[cfg(test)]
mod tests {
    use crate::CyclicByteBuffer;

    // #[test]
    // fn correctly_does_first_append_when_size_lt_buffer_size() {
    //     // given
    //     let mut buffer: CyclicByteBuffer = CyclicByteBuffer {
    //         read_offset: 0,
    //         write_offset: 0,
    //         items_count: 0,
    //         buffer: [0; 5],
    //     };
    //     let item = vec![1u8, 2u8];
    //     // when
    //     buffer.append(item);
    //     // then
    //     assert_eq!(buffer.write_offset, 4);
    //     assert_eq!(buffer.read_offset, 0);
    //     assert_eq!(buffer.raw(), [0, 2, 1, 2, 0]);
    // }
    //
    // #[test]
    // fn correctly_does_first_append_when_size_eq_buffer_size() {
    //     // given
    //     let mut buffer: CyclicByteBuffer = CyclicByteBuffer {
    //         read_offset: 0,
    //         write_offset: 0,
    //         items_count: 0,
    //         buffer: [0; 5],
    //     };
    //     let item = vec![1u8, 2u8, 3u8];
    //     // when
    //     buffer.append(item);
    //     // then
    //     assert_eq!(buffer.write_offset, 0);
    //     assert_eq!(buffer.read_offset, 0);
    //     assert_eq!(buffer.raw(), [0, 3, 1, 2, 3]);
    // }
    //
    // #[test]
    // fn correctly_does_first_append_and_overwrite_when_size_eq_buffer_size() {
    //     // given
    //     let mut buffer: CyclicByteBuffer = CyclicByteBuffer {
    //         read_offset: 0,
    //         write_offset: 0,
    //         items_count: 0,
    //         buffer: [0; 5],
    //     };
    //     let item1 = vec![1u8, 2u8, 3u8];
    //     let item2 = vec![4u8, 5u8, 6u8];
    //     // when
    //     buffer.append(item1);
    //     buffer.append(item2);
    //     // then
    //     assert_eq!(buffer.write_offset, 0);
    //     assert_eq!(buffer.read_offset, 0);
    //     assert_eq!(buffer.raw(), [0, 3, 4, 5, 6]);
    // }
    //
    // #[test]
    // fn correctly_does_first_append_and_overwrite_when_size_lt_buffer_size() {
    //     // given
    //     let mut buffer: CyclicByteBuffer = CyclicByteBuffer {
    //         read_offset: 0,
    //         write_offset: 0,
    //         items_count: 0,
    //         buffer: [0; 5],
    //     };
    //     let item1 = vec![1u8, 2u8];
    //     let item2 = vec![3u8, 4u8];
    //     // when
    //     buffer.append(item1);
    //     buffer.append(item2);
    //     // then
    //     assert_eq!(buffer.write_offset, 3);
    //     assert_eq!(buffer.read_offset, 4);
    //     assert_eq!(buffer.raw(), [2, 3, 4, 0, 0]);
    // }
    //
    // #[test]
    // fn correctly_does_first_append_and_overwrite_when_size_lt_buffer_size() {
    //     // given
    //     let mut buffer: CyclicByteBuffer = CyclicByteBuffer {
    //         read_offset: 0,
    //         write_offset: 0,
    //         items_count: 0,
    //         buffer: [0; 7],
    //     };
    //     let item1 = vec![1u8, 2u8];
    //     let item2 = vec![3u8, 4u8, 5u8];
    //     let item3 = vec![6u8, 7u8];
    //     // when
    //     buffer.append(item1);
    //     // [0, 2, 1, 2, 0, 0, 0]
    //     assert_eq!(buffer.read_offset, 0);
    //     buffer.append(item2);
    //     // [4, 5, 0, 0, 0, 3, 3]
    //     assert_eq!(buffer.read_offset, 4);
    //     buffer.append(item3);
    //     // then
    //     assert_eq!(buffer.write_offset, 6);
    //     assert_eq!(buffer.read_offset, 2);
    //     assert_eq!(buffer.raw(), [0, 0, 0, 2, 6, 7, 0]);
    // }
}
