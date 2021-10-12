use anchor_lang::prelude::*;

/*
Entrypoints
*/
#[program]
mod dialect {
    use super::*;
    pub fn create_user_settings_account(
        ctx: Context<CreateSettingsAccount>,
        _nonce: u8,
    ) -> ProgramResult {
        let settings_account = &mut ctx.accounts.settings_account;
        settings_account.owner = *ctx.accounts.owner.key;
        settings_account.threads = vec![];
        Ok(())
    }

    pub fn create_thread_account(ctx: Context<CreateThreadAccount>, _nonce: u8) -> ProgramResult {
        // set the owner of the thread account
        let thread_account = &mut ctx.accounts.thread_account;
        thread_account.owner = *ctx.accounts.owner.key;
        // add the owner to the members
        thread_account.members = vec![Member {
            key: *ctx.accounts.owner.key,
        }];
        // iniialize message_idx
        thread_account.message_idx = 0;
        // add the thread to the owner's settings.threads
        let settings_account = &mut ctx.accounts.settings_account;
        let threads = &mut settings_account.threads;
        let mut new_threads = vec![SettingsThreadRef {
            key: *ctx.accounts.thread_account.to_account_info().key,
        }];
        threads.append(&mut new_threads);
        Ok(())
    }

    pub fn add_user_to_thread(ctx: Context<AddUserToThread>, _nonce: u8) -> ProgramResult {
        // add the thread to user settings.threads
        let invitee_settings_account = &mut ctx.accounts.invitee_settings_account;
        let threads = &mut invitee_settings_account.threads;
        let mut new_threads = vec![SettingsThreadRef {
            key: *ctx.accounts.thread_account.to_account_info().key,
        }];
        threads.append(&mut new_threads);
        // add the user to thread.members
        let members = &mut ctx.accounts.thread_account.members;
        let mut new_members = vec![Member {
            key: *ctx.accounts.invitee.key,
        }];
        members.append(&mut new_members);
        Ok(())
    }

    pub fn add_message_to_thread(
        ctx: Context<AddMessageToThread>,
        _nonce: u8,
        text: String,
        encrypted: bool,
    ) -> ProgramResult {
        // TODO: Verify that sender is a member of the thread
        // increment thread.message_idx
        let thread_account = &mut ctx.accounts.thread_account;
        thread_account.message_idx += 1;
        // set the message data
        let message_account = &mut ctx.accounts.message_account;
        message_account.owner = *ctx.accounts.sender.key;
        message_account.text = text;
        message_account.idx = thread_account.message_idx;
        message_account.encrypted = encrypted;
        Ok(())
    }
}

/*
Contexts
*/
#[derive(Accounts)]
#[instruction(_nonce: u8)]
pub struct CreateSettingsAccount<'info> {
    #[account(signer, mut)]
    pub owner: AccountInfo<'info>,
    #[account(
        init,
        seeds = [owner.key.as_ref(), b"settings_account", &[_nonce]],
        payer = owner,
        space = 512,
    )]
    pub settings_account: ProgramAccount<'info, SettingsAccount>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(_nonce: u8)]
pub struct CreateThreadAccount<'info> {
    #[account(signer)]
    pub owner: AccountInfo<'info>,
    #[account(init)]
    pub thread_account: ProgramAccount<'info, ThreadAccount>,
    #[account(
        mut,
        seeds = [owner.key.as_ref(), b"settings_account", &[_nonce]],
        has_one = owner,
    )]
    pub settings_account: ProgramAccount<'info, SettingsAccount>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(_nonce: u8)]
pub struct AddUserToThread<'info> {
    #[account(signer)]
    pub owner: AccountInfo<'info>,
    pub invitee: AccountInfo<'info>,
    #[account(mut, has_one = owner)] // only the owner can add users
    pub thread_account: ProgramAccount<'info, ThreadAccount>,
    #[account(
        mut,
        seeds = [invitee.key.as_ref(), b"settings_account", &[_nonce]],
    )]
    pub invitee_settings_account: ProgramAccount<'info, SettingsAccount>,
}

#[derive(Accounts)]
#[instruction(_nonce: u8)]
pub struct AddMessageToThread<'info> {
    #[account(signer)]
    pub sender: AccountInfo<'info>,
    #[account(
        init,
        seeds = [
            thread_account.to_account_info().key.as_ref(),
            b"message_account",
            (thread_account.message_idx + 1).to_string().as_bytes(), // u32 as &[u8]
            &[_nonce],
        ],
        payer = sender,
        space = 1024,
    )]
    pub message_account: ProgramAccount<'info, MessageAccount>,
    #[account(mut)]
    pub thread_account: ProgramAccount<'info, ThreadAccount>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: AccountInfo<'info>,
}

/*
Accounts
*/
#[account]
#[derive(Default)]
pub struct SettingsAccount {
    pub owner: Pubkey,
    pub threads: Vec<SettingsThreadRef>,
}

#[account]
#[derive(Default)]
pub struct ThreadAccount {
    pub owner: Pubkey,
    pub members: Vec<Member>,
    pub message_idx: u32, // ~140 years @ 1 message / sec
}

#[account]
#[derive(Default)]
pub struct MessageAccount {
    pub owner: Pubkey, // sender
    pub text: String,  // TODO: use [u8; 280]
    pub idx: u32,      // not sure we need this
    pub encrypted: bool,
}

/*
Data
*/
#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone, Copy)]
pub struct SettingsThreadRef {
    pub key: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone, Copy)]
pub struct Member {
    pub key: Pubkey,
}
