use anchor_lang::prelude::*;

#[program]
mod dialect {
    use super::*;
    pub fn create_user_threads_account(
        ctx: Context<CreateThreadsAccountContext>,
        _nonce: u8,
    ) -> ProgramResult {
        let threads_account = &mut ctx.accounts.threads_account;
        threads_account.owner = *ctx.accounts.owner.key;
        threads_account.threads = vec![];
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(_nonce: u8)]
pub struct CreateThreadsAccountContext<'info> {
    #[account(signer)]
    pub owner: AccountInfo<'info>,
    #[account(
        init,
        seeds = [owner.key.as_ref(), b"threads_account", &[_nonce]],
        payer = owner,
        space = 512,
    )]
    pub threads_account: ProgramAccount<'info, ThreadsAccount>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct UpdateThreadsAccountContext<'info> {
    #[account(mut)]
    pub threads_account: ProgramAccount<'info, ThreadsAccount>,
}

#[account]
#[derive(Default)]
pub struct ThreadsAccount {
    pub owner: Pubkey,
    pub threads: Vec<Thread>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone, Copy)]
pub struct Thread {
    pub key: Pubkey,
}
