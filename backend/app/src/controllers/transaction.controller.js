import prisma from '../config/postgres.config.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/ApiError.js'
import { ApiResponse } from '../utils/ApiResponse.js'

const getCurrentUserBalance = asyncHandler(async (req, res) => {
  const userBalance = await prisma.user.findUnique({
    where: {
      userid: req.user._id,
    },
  })
  if (!userBalance) {
    throw new ApiError(404, 'user not found')
  }

  const response = {
    userId: userBalance.userid,
    balance: userBalance.balance,
  }

  res.status(200).json(new ApiResponse(200, response, 'user balance fetched successfully'))
})

const transferMoney = asyncHandler(async (req, res) => {
  const { receiver, amount } = req.body
  const sender = req.user?._id

  if (!receiver || !sender || !amount) {
    throw new ApiError(400, 'sender, receiver, amount require')
  }
  if (amount <= 0) {
    throw new ApiError(400, 'amount must be positive')
  }
  // transaction
  await prisma.$transaction(async (tx) => {
    const debit = await tx.user.updateMany({
      where: {
        userid: sender,
        balance: { gte: amount },
      },
      data: {
        balance: { decrement: amount },
      },
    })

    if (debit.count === 0) {
      throw new ApiError(400, 'Sender not found or insufficient balance')
    }
    // credit
    await tx.user.update({
      where: {
        userid: receiver,
      },
      data: {
        balance: { increment: amount },
      },
    })
  })

  res.status(200).json(new ApiResponse(200, {}, 'transaction is successful'))
})

export { getCurrentUserBalance, transferMoney }
