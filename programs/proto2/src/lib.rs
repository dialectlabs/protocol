use anchor_lang::prelude::*;

declare_id!("FBg6zTf1QMKD8CXGF1MdCa2paUosBfokidALJ7tXpHMX");
/*
Entrypoints
*/
#[program]
mod proto2 {
    use super::*;
    pub fn create_queue_account(
        ctx: Context<CreateQueueAccount>,
        _queue_nonce: u8,
    ) -> ProgramResult {
        ctx.accounts.queue_account.owner = *ctx.accounts.queue_owner.key;
        Ok(())
    }

    pub fn add_message_to_queue(
        ctx: Context<AddMessageToQueue>,
        _queue_nonce: u8,
        text: [u8; 256],
        timestamp: i64,
    ) -> ProgramResult {
        let sender = *ctx.accounts.sender.key;
        let receiver = *ctx.accounts.receiver.key;
        let queue_account = &mut ctx.accounts.queue_account;
        queue_account.messages.push(Message {
            sender,
            receiver,
            text,
            timestamp,
        });
        Ok(())
    }
}

/*
Contexts
*/
#[derive(Accounts)]
#[instruction(queue_nonce: u8)]
pub struct CreateQueueAccount<'info> {
    #[account(signer, mut)]
    pub queue_owner: AccountInfo<'info>,
    #[account(
        init,
        seeds = [queue_owner.key.as_ref(), b"queue_account".as_ref()],
        bump = queue_nonce,
        payer = queue_owner,
        space = 10240,
    )]
    pub queue_account: ProgramAccount<'info, QueueAccount>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(queue_nonce: u8)]
pub struct AddMessageToQueue<'info> {
    #[account(signer, mut)]
    pub sender: AccountInfo<'info>,
    pub receiver: AccountInfo<'info>,
    pub queue_owner: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [
            queue_owner.key.as_ref(),
            b"queue_account".as_ref()
        ],
        bump = queue_nonce,
    )]
    pub queue_account: ProgramAccount<'info, QueueAccount>,
}

#[account]
pub struct QueueAccount {
    pub owner: Pubkey,
    pub messages: Vec<Message>,
}

/*
Data
*/
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct Message {
    pub sender: Pubkey,
    pub receiver: Pubkey,
    pub text: [u8; 256],
    pub timestamp: i64, // safe from 2038 bug?
}

impl Default for Message {
    fn default() -> Self {
        Self {
            sender: Pubkey::default(),
            receiver: Pubkey::default(),
            text: [0; 256],
            timestamp: 0,
        }
    }
}
