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
        // Currently this next line panics
        let mut queue_account = ctx.accounts.queue_account.load_init()?;
        queue_account.owner = *ctx.accounts.queue_owner.key;
        // queue_account.messages = [Message::default(); 31];
        let mut n = 0;
        for msg in queue_account.messages.iter_mut() {
            let mut x: [u8; std::mem::size_of::<Message>()] = [0; std::mem::size_of::<Message>()];
            for j in x.iter_mut() {
                *j = n;
                n += 1;
            }
            *msg = unsafe { std::mem::transmute(x) };
        }
        Ok(())
    }

    pub fn add_message_to_queue(
        ctx: Context<AddMessageToQueue>,
        _queue_nonce: u8,
        text: [u8; 32],
        timestamp: i64,
    ) -> ProgramResult {
        let sender = *ctx.accounts.sender.key;
        let receiver = *ctx.accounts.receiver.key;
        let queue_account = &mut ctx.accounts.queue_account.load_mut()?;
        let idx = queue_account.idx as usize;
        queue_account.messages[idx] = Message {
            sender,
            receiver,
            text,
            timestamp,
        };
        // queue_account.messages.push(Message {
        //     sender,
        //     receiver,
        //     text,
        //     timestamp,
        // });
        queue_account.idx += 1;
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
        space =10240,
    )]
    pub queue_account: Loader<'info, QueueAccount>,
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
    pub queue_account: Loader<'info, QueueAccount>,
}

// #[derive(AnchorSerialize, AnchorDeserialize, Default)]
#[account(zero_copy)]
pub struct QueueAccount {
    pub owner: Pubkey,
    pub messages: [Message; 16],
    idx: u32,
}

/*
Data
*/
#[zero_copy]
#[derive(Default)]
pub struct Message {
    pub sender: Pubkey,
    pub receiver: Pubkey,
    pub text: [u8; 32],
    pub timestamp: i64, // safe from 2038 bug?
}
