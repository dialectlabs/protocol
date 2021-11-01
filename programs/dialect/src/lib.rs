use anchor_lang::prelude::*;
use anchor_spl::token::Mint;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

/*
Entrypoints
*/
#[program]
pub mod dialect {
    use super::*;
    pub fn initialize(_ctx: Context<Initialize>) -> ProgramResult {
        msg!("hello from initialize");
        Ok(())
    }

    pub fn create_dialect(ctx: Context<CreateDialect>) -> ProgramResult {
        let mint = &ctx.accounts.mint;
        msg!("mint_authority");
        msg!("{:?}", &mint.mint_authority);
        Ok(())
    }
}

/*
Contexts
*/
#[derive(Accounts)]
pub struct Initialize {}

#[derive(Accounts)]
pub struct CreateDialect<'info> {
    pub mint: Account<'info, Mint>,
    // TODO: Can anchor access control enforce that the authority is the mint authority as well?
    pub authority: AccountInfo<'info>,
    // TODO: Choose space
    // #[account(init, payer = authority, space = 512)]
    // pub dialect: Account<'info, DialectAccount>,
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
    pub authority: Pubkey, // Must be the mint authority as well. TODO: Can we rm this?
}

/*
Data
*/
