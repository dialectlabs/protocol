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
        text: String,
        timestamp: i64,
    ) -> ProgramResult {
        let sender = *ctx.accounts.sender.key;
        let receiver = *ctx.accounts.receiver.key;
        ctx.accounts.queue_account.messages.push(Message {
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
    pub rent: Sysvar<'info, Rent>,
    // pub system_program: AccountInfo<'info>,
}

#[account]
#[derive(Default)]
pub struct QueueAccount {
    pub owner: Pubkey,
    pub messages: Vec<Message>,
}

/*
Data
*/
#[derive(AnchorSerialize, AnchorDeserialize, Default, Clone)]
pub struct Message {
    pub sender: Pubkey,
    pub receiver: Pubkey,
    pub text: String,   // TODO: use [u8; 280]
    pub timestamp: i64, // safe from 2038 bug?
}
