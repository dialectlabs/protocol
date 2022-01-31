use std::array;

use anchor_lang::prelude::*;

declare_id!("2YFyZAg8rBtuvzFFiGvXwPHFAQJ2FXZoS7bYCKticpjk");

/*
Entrypoints
*/
#[program]
pub mod dialect {
    use super::*;

    /*
    User metadata
    */

    pub fn create_metadata(ctx: Context<CreateMetadata>, _metadata_nonce: u8) -> ProgramResult {
        let metadata_loader = &ctx.accounts.metadata;
        let metadata = &mut metadata_loader.load_init()?;
        metadata.user = ctx.accounts.user.key();
        metadata.subscriptions = [Subscription::default(); 32];

        emit!(CreateMetadataEvent {
            metadata: metadata_loader.key(),
            user: ctx.accounts.user.key()
        });

        Ok(())
    }

    pub fn close_metadata(ctx: Context<CloseMetadata>, _metadata_nonce: u8) -> ProgramResult {
        let metadata_loader = &ctx.accounts.metadata;
        let metadata = metadata_loader.load()?;

        emit!(CloseMetadataEvent {
            metadata: metadata_loader.key(),
            user: metadata.user,
        });

        Ok(())
    }

    /*
    Dialects
    */

    pub fn create_dialect(
        ctx: Context<CreateDialect>,
        _dialect_nonce: u8,
        encrypted: bool,
        scopes: [[bool; 2]; 2],
    ) -> ProgramResult {
        // TODO: Assert owner in members
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

        emit!(CreateDialectEvent {
            dialect: dialect_loader.key(),
            members: [*members[0].key, *members[1].key],
        });

        Ok(())
    }

    pub fn close_dialect(ctx: Context<CloseDialect>, _dialect_nonce: u8) -> ProgramResult {
        let dialect_loader = &ctx.accounts.dialect;
        let dialect = dialect_loader.load()?;

        emit!(CloseDialectEvent {
            dialect: dialect_loader.key(),
            members: [dialect.members[0].public_key, dialect.members[1].public_key],
        });

        Ok(())
    }

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
            emit!(SubscribeUserEvent {
                metadata: metadata_loader.key(),
                dialect: dialect.key()
            });
        } else {
            // Handle max subscriptions
            msg!("User already subscribed to 32 dialects");
        }
        Ok(())
    }

    pub fn send_message(
        ctx: Context<SendMessage>,
        _dialect_nonce: u8,
        text: Vec<u8>,
    ) -> ProgramResult {
        let dialect_loader = &ctx.accounts.dialect;
        let mut dialect = dialect_loader.load_mut()?;
        let sender = &mut ctx.accounts.sender;
        dialect.append(text, sender);

        emit!(SendMessageEvent {
            dialect: dialect_loader.key(),
            sender: *sender.key,
        });
        Ok(())
    }
}

/*
Contexts
*/

#[derive(Accounts)]
#[instruction(metadata_nonce: u8)]
pub struct CreateMetadata<'info> {
    #[account(signer, mut)]
    pub user: AccountInfo<'info>,
    #[account(
        init,
        seeds = [
            b"metadata".as_ref(),
            user.key.as_ref(),
        ],
        bump = metadata_nonce,
        payer = user,
        // discriminator (8) + user + 32 x (subscription) = 1096
        space = 8 + 32 + (32 * 33),
    )]
    pub metadata: Loader<'info, MetadataAccount>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(metadata_nonce: u8)]
pub struct CloseMetadata<'info> {
    #[account(signer, mut)]
    pub user: AccountInfo<'info>,
    #[account(
        mut,
        close = user,
        seeds = [
            b"metadata".as_ref(),
            user.key.as_ref(),
        ],
        has_one = user, // TODO: Confirm if seeds solves this
        bump = metadata_nonce,
    )]
    pub metadata: Loader<'info, MetadataAccount>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(dialect_nonce: u8, metadata_nonce: u8)] // metadata0_nonce: u8, metadata1_nonce: u8)]
pub struct SubscribeUser<'info> {
    #[account(signer, mut)]
    pub signer: AccountInfo<'info>,
    // Consider at some point enforcing user = signer
    pub user: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [
            b"metadata".as_ref(),
            user.key().as_ref(),
        ],
        bump = metadata_nonce,
        constraint = metadata
            .load()?
            .subscriptions
            .iter()
            .filter(|s| s.pubkey == dialect.key())
            .count() < 1 // no duplicate subscriptions
    )]
    pub metadata: Loader<'info, MetadataAccount>,
    pub dialect: AccountInfo<'info>, // we only need the pubkey, so AccountInfo is fine. TODO: is this a security risk?
    pub rent: Sysvar<'info, Rent>,
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(dialect_nonce: u8)]
pub struct CreateDialect<'info> {
    #[account(signer, mut)] // mut is needed because they're the payer for PDA initialization
    // We dupe the owner in one of the members, since the members must be sorted
    pub owner: AccountInfo<'info>,
    pub member0: AccountInfo<'info>,
    pub member1: AccountInfo<'info>,
    // Support more users in this or other dialect struct
    #[account(
        init,
        // TODO: Assert that owner is a member with admin privileges
        seeds = [
            b"dialect".as_ref(),
            member0.key().as_ref(),
            member1.key().as_ref(),
        ],
        constraint = member0.key().cmp(&member1.key()) == std::cmp::Ordering::Less, // n.b. asserts !eq as well
        bump = dialect_nonce,
        payer = owner,
        // NB: max space for PDA = 10240
        // space = discriminator + dialect account size
        space = 8 + 68 + (2 + 2 + 2 + 8192) + 4 + 1
    )]
    pub dialect: Loader<'info, DialectAccount>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(dialect_nonce: u8)]
pub struct CloseDialect<'info> {
    #[account(
        signer,
        mut,
        constraint = dialect.load()?.members.iter().filter(|m| m.public_key == *owner.key && m.scopes[0] == true).count() > 0,
    )]
    pub owner: AccountInfo<'info>,
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
    pub dialect: Loader<'info, DialectAccount>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(dialect_nonce: u8)]
pub struct SendMessage<'info> {
    #[account(
        signer,
        mut,
        constraint = dialect.load()?.members.iter().filter(|m| m.public_key == *sender.key && m.scopes[1] == true).count() > 0,
    )]
    pub sender: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [
            b"dialect".as_ref(),
            dialect.load()?.members[0].public_key.as_ref(),
            dialect.load()?.members[1].public_key.as_ref(),
        ],
        bump = dialect_nonce,
    )]
    pub dialect: Loader<'info, DialectAccount>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: AccountInfo<'info>,
}

/*
Accounts
*/

#[account(zero_copy)]
#[derive(Default)]
pub struct MetadataAccount {
    // Add profile
    user: Pubkey,                      // 32
    subscriptions: [Subscription; 32], // 32 * space(Subscription)
}

const MESSAGE_BUFFER_LENGTH: usize = 8192;
const ITEM_METADATA_OVERHEAD: u16 = 2;

#[account(zero_copy)]
// NB: max space for PDA = 10240
// space = 8 + 68 + (2 + 2 + 2 + 8192) + 4 + 1
pub struct DialectAccount {
    pub members: [Member; 2],        // 2 * Member = 68
    pub messages: CyclicByteBuffer,  // 2 + 2 + 2 + 8192
    pub last_message_timestamp: u32, // 4, UTC seconds, max value = Sunday, February 7, 2106 6:28:15 AM
    pub encrypted: bool,             // 1
}

impl DialectAccount {
    fn append(&mut self, text: Vec<u8>, sender: &mut AccountInfo) {
        let now = Clock::get().unwrap().unix_timestamp as u32;
        self.last_message_timestamp = now;
        let sender_member_idx = self
            .members
            .iter()
            .position(|m| m.public_key == *sender.key)
            .unwrap() as u8;
        let mut serialized_message = Vec::new();
        serialized_message.extend(array::IntoIter::new(sender_member_idx.to_be_bytes()));
        serialized_message.extend(array::IntoIter::new(now.to_be_bytes()));
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
    /// * `item` - an bytebuffer/bytearray to be appended.
    fn append(&mut self, item: Vec<u8>) {
        let item_with_metadata = &mut Vec::new();
        let item_len = (item.len() as u16).to_be_bytes();
        item_with_metadata.extend(array::IntoIter::new(item_len));
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
    /// * `value` - an offset/position to be re-calculated.
    fn mod_(&mut self, value: u16) -> u16 {
        return value % MESSAGE_BUFFER_LENGTH as u16;
    }

    /// Returns true if there's no free space to append item of size [item_size] to buffer.
    ///
    /// Used to re-calculate offset within cyclic buffer structure w/o moving out of buffer boundaries.
    ///
    /// ### Arguments
    ///
    /// * `item_size` - a size of an item that is added to buffer.
    fn no_space_available_for(&mut self, item_size: u16) -> bool {
        return self.get_available_space() < item_size;
    }

    /// Returns the amount of available free space.
    fn get_available_space(&mut self) -> u16 {
        if self.items_count == 0 {
            return MESSAGE_BUFFER_LENGTH as u16;
        }
        return self.mod_(MESSAGE_BUFFER_LENGTH as u16 + self.read_offset - self.write_offset);
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
        return u16::from_be_bytes([self.buffer[read_offset as usize], self.buffer[0]]);
    }

    /// Performs writing of [item] to buffer at [write_offset] position.
    ///
    /// ### Arguments
    ///
    /// * `item` - an bytebuffer/bytearray to be written at [write_offset] position.
    /// * `new_write_offset` - a new [write_offset] to be set after writing.
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
    /// * `item` - an bytebuffer/bytearray to be written at [offset] position.
    /// * `offset` - an [offset] where to write item.
    fn write(&mut self, item: &mut Vec<u8>, offset: u16) {
        for (idx, e) in item.iter().enumerate() {
            let pos = self.mod_(offset + idx as u16);
            self.buffer[pos as usize] = *e;
        }
    }

    /// Returns an underlying [buffer] that contains all items.
    fn raw(&mut self) -> [u8; MESSAGE_BUFFER_LENGTH] {
        return self.buffer;
    }
}

/*
Data
*/

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
pub struct CreateDialectEvent {
    /// Address of newly created dialect account.
    pub dialect: Pubkey,
    /// A list of dialect members: two users who exchange messages using single dialect account.
    pub members: [Pubkey; 2],
}

/// An event that is fired when some user sends message to dialect account.
#[event]
pub struct CloseDialectEvent {
    pub dialect: Pubkey,
    pub members: [Pubkey; 2], // Use struct Member
}

#[event]
pub struct SendMessageEvent {
    /// Address of dialect account where messaging happens.
    pub dialect: Pubkey,
    /// User that sent a message.
    pub sender: Pubkey,
}

/// An event that is fired when the metadata account owner is subscribed to dialect.
#[event]
pub struct SubscribeUserEvent {
    /// Address of owner metadata account, where subscription to dialect is stored.
    pub metadata: Pubkey,
    /// Address of dialect account to which user was subscribed.
    pub dialect: Pubkey,
}

/// An event that is fired when new metadata account is created.
#[event]
pub struct CreateMetadataEvent {
    /// Address of metadata account.
    pub metadata: Pubkey,
    /// Owner of metadata account.
    pub user: Pubkey,
}

#[event]
pub struct CloseMetadataEvent {
    pub metadata: Pubkey,
    pub user: Pubkey,
}

/*
Helper functions
*/

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
