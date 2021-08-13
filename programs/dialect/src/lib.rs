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
        let settings_account = &mut ctx.accounts.settings_account;
        let threads = &mut settings_account.threads;
        let mut new_threads = vec![Thread {
            key: *ctx.accounts.thread_account.to_account_info().key,
        }];
        threads.append(&mut new_threads);
        Ok(())
    }
}

/*
Contexts
*/
#[derive(Accounts)]
#[instruction(_nonce: u8)]
pub struct CreateSettingsAccount<'info> {
    #[account(signer)]
    pub owner: AccountInfo<'info>,
    #[account( // do we need has_one? i think seeds solves this
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

/*
Accounts
*/
#[account]
#[derive(Default)]
pub struct SettingsAccount {
    pub owner: Pubkey,
    pub threads: Vec<Thread>,
}

#[account]
#[derive(Default)]
pub struct ThreadAccount {
    pub owner: Pubkey,
}

/*
Data
*/
#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone, Copy)]
pub struct Thread {
    pub key: Pubkey,
}
