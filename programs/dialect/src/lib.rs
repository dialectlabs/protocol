use anchor_lang::prelude::*;
use anchor_spl::token::Mint;
use solana_program::program_option::COption;

declare_id!("5KqWSKK4urvq6LMRyKV6BrC5qPTXr7B3YK8xFmF3MAX7");

/*
Entrypoints
*/
#[program]
pub mod dialect {
    use super::*;
    pub fn create_dialect(ctx: Context<CreateDialect>, _dialect_nonce: u8) -> ProgramResult {
        let mint = &ctx.accounts.mint;
        let dialect = &mut ctx.accounts.dialect;
        dialect.mint = mint.key();
        Ok(())
    }
}

/*
Contexts
*/

#[derive(Accounts)]
#[instruction(dialect_nonce: u8)]
pub struct CreateDialect<'info> {
    #[account(signer, mut)] // mut is needed because they're the payer for PDA initialization
    pub mint_authority: AccountInfo<'info>, // The dialect owner must be the mint authority
    // TODO: Enforce that mint.mint_authority exists
    #[account(constraint = COption::Some(mint_authority.key()) == mint.mint_authority)]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        seeds = [b"dialect".as_ref(), mint.key().as_ref()],
        bump = dialect_nonce,
        payer = mint_authority,
        space = 512, // TODO: Choose space
    )]
    pub dialect: Account<'info, DialectAccount>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: AccountInfo<'info>,
}

/*
Accounts
*/
#[account]
#[derive(Default)]
pub struct DialectAccount {
    pub mint: Pubkey,
    // pub mint_authority: Pubkey, // TODO: Do we need this?
}

/*
Data
*/
