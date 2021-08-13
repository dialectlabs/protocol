use anchor_lang::prelude::*;

#[program]
mod dialect {
    use super::*;
    pub fn create_user_settings_account(
        ctx: Context<CreateSettingsAccountContext>,
        _nonce: u8,
    ) -> ProgramResult {
        let settings_account = &mut ctx.accounts.settings_account;
        settings_account.owner = *ctx.accounts.owner.key;
        settings_account.threads = vec![];
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(_nonce: u8)]
pub struct CreateSettingsAccountContext<'info> {
    #[account(signer)]
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
pub struct UpdateSettingsAccountContext<'info> {
    #[account(mut)]
    pub settings_account: ProgramAccount<'info, SettingsAccount>,
}

#[account]
#[derive(Default)]
pub struct SettingsAccount {
    pub owner: Pubkey,
    pub threads: Vec<Thread>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone, Copy)]
pub struct Thread {
    pub key: Pubkey,
}
