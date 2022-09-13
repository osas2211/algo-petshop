from pyteal import *
from pyteal.ast import *

# algosandbox goal app create --creator $acc1 --approval-prog contracts/mod_approval.teal --clear-prog contracts/mod_clear.teal --note pet-shop:uMod --global-byteslices 0 --global-ints 1 --local-byteslices 0 --local-ints 0 --app-arg int:1000000


def approval():
    # globals
    global_adopt_fee = Bytes("FEE")  # uint64

    update_fee = Bytes("newFee")

    # init application with a fee
    def init():
        return Seq(
            [
                # The number of arguments attached to the transaction should be exactly 1.
                Assert(Txn.application_args.length() == Int(1)),

                # check for note, Mod for moderator
                Assert(Txn.note() == Bytes("pet-shop:uMod")),

                # check that argument passed which is pet shop fee is greater than zero
                Assert(Btoi(Txn.application_args[0]) > Int(0)),

                # set adoption fee
                App.globalPut(global_adopt_fee, Btoi(Txn.application_args[0])),

                Approve(),
            ]
        )

    def updateFee():
        return Seq(
            [
                # The number of arguments attached to the transaction should be exactly 1.
                Assert(Txn.application_args.length() == Int(2)),

                # check that argument passed which is pet shop fee is greater than zero
                Assert(Btoi(Txn.application_args[1]) > Int(0)),

                # update fee for adoption
                App.globalPut(global_adopt_fee, Btoi(Txn.application_args[1])),

                Approve(),
            ]
        )

    def application_deletion():
        return Return(Txn.sender() == Global.creator_address())

    def application_start():
        return Cond(
            # checks if the application_id field of a transaction matches 0.
            # If this is the case, the application does not exist yet, and the application_creation() method is called
            [Txn.application_id() == Int(0), init()],
            # If the the OnComplete action of the transaction is DeleteApplication, the application_deletion() method is called
            [Txn.on_completion() == OnComplete.DeleteApplication,
             application_deletion()],
            # if the irst argument of the transaction matches the AppMethods.buy value, the buy() method is called.
            [Txn.application_args[0] == update_fee, updateFee()]
        )

    return application_start()


def clear():
    return Approve()
