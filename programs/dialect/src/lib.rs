use anchor_lang::prelude::*;

#[program]
mod dialect {
    use super::*;
    pub fn create_user_threads_account(
        ctx: Context<CreateThreadsAccountContext>,
        message: String,
    ) -> ProgramResult {
        let mut threads_account = ctx.accounts.threads_account.load_init()?;
        // threads_account.message = 8;
        let src = message.as_bytes();
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

#[account(zero_copy)]
pub struct ThreadsData {
    pub message: [u8; 280],
}
