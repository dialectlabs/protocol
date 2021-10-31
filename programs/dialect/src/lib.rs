use anchor_lang::prelude::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

/*
Entrypoints
*/
#[program]
pub mod dialect {
    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> ProgramResult {
        Ok(())
    }
    pub fn create_dialect(ctx: Context<CreateDialect>) -> ProgramResult {
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
    #[account(signer)]
    pub owner: AccountInfo<'info>,
    #[account(init, payer = owner, space=512)]
    pub dialect: Account<'info, DialectAccount>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: AccountInfo<'info>,
}

/*
Accounts
*/
#[account]
#[derive(Default)]
pub struct DialectAccount {}

/*
Data
*/
