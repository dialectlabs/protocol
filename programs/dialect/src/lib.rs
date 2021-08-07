use anchor_lang::prelude::*;

#[program]
mod dialect {
    use super::*;
    pub fn create_user_threads_account(
        ctx: Context<CreateThreadsAccountContext>,
        message: String,
    ) -> ProgramResult {
        let mut threads_account = ctx.accounts.threads_account.load_init()?;
        let src = message.as_bytes();
        let mut data = [0u8; 280];
        data[..src.len()].copy_from_slice(src);
        threads_account.message = data;
        Ok(())
    }

    pub fn update_user_threads_account(
        ctx: Context<UpdateThreadsAccountContext>,
        new_message: String,
    ) -> ProgramResult {
        let mut threads_account = ctx.accounts.threads_account.load_mut()?;
        let src = new_message.as_bytes();
        let mut data = [0u8; 280];
        data[..src.len()].copy_from_slice(src);
        threads_account.message = data;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateThreadsAccountContext<'info> {
    #[account(init)]
    pub threads_account: Loader<'info, ThreadsData>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdateThreadsAccountContext<'info> {
    #[account(mut)]
    pub threads_account: Loader<'info, ThreadsData>,
}

#[account(zero_copy)]
pub struct ThreadsData {
    pub message: [u8; 280],
}
