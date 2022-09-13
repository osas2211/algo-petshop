from pyteal import *

# algosandbox goal app create --creator $acc1 --approval-prog contracts/petshop_approval.teal --clear-prog contracts/petshop_clear.teal --note pet-shop:uPets --global-byteslices 5 --global-ints 2 --local-byteslices 0 --local-ints 0 --app-arg str:TestPet --app-arg str:TestImage --app-arg int:5 --app-arg str:TestBreed --app-arg str:TestLocation


class Pet:
    class Variables:
        name = Bytes("NAME")  # ByteSlice
        image = Bytes("IMAGE")  # ByteSlice
        age = Bytes("AGE")  # Uint64
        breed = Bytes("BREED")  # ByteSlice
        location = Bytes("LOCATION")  # ByteSlice
        adopted = Bytes("ADOPTED")  # Uint64 0 means false, 1 means true
        owner = Bytes("OWNER")  # ByteSlice
        fee = Bytes("ADOPT_FEE")  # Uint64

    class AppMethods:
        adopt = Bytes("adopt")
        test = Bytes("test")

    # to create a new pet listed for adoption
    def application_creation(self):
        return Seq([
            # The number of arguments attached to the transaction should be exactly 4.
            Assert(Txn.application_args.length() == Int(5)),

            # The note attached to the transaction must be "tutorial-marketplace:uv1", which we define to be the note that marks a product within our marketplace
            Assert(Txn.note() == Bytes("pet-shop:uPets")),

            # Store the transaction arguments into the applications's global's state
            App.globalPut(self.Variables.name, Txn.application_args[0]),
            App.globalPut(self.Variables.image, Txn.application_args[1]),
            App.globalPut(self.Variables.age, Btoi(Txn.application_args[2])),
            App.globalPut(self.Variables.breed, Txn.application_args[3]),
            App.globalPut(self.Variables.location, Txn.application_args[4]),
            App.globalPut(self.Variables.adopted, Int(0)),
            App.globalPut(self.Variables.owner, Txn.sender()),

            Approve(),
        ])
    # mod_contract = Txn.applications[1]

    def getAdoptFee(self, mod_contract: Expr):
        # gets fee from mod_contract
        get_global_fee = App.globalGetEx(mod_contract, Bytes("FEE"))

        return Seq(
            get_global_fee,
            If(get_global_fee.hasValue(),  App.globalPut(self.Variables.fee,
               get_global_fee.value()), App.globalPut(self.Variables.fee, Int(0))),
        )

    def adopt(self):
        # The number of transactions within the group transaction must be exactly 2.
        # first one being the adopt function and the second being the payment transactions
        valid_number_of_transacations = Global.group_size() == Int(2)

        # check that the adopt call is made ahead of the payment transaction
        valid_transaction_order = Txn.group_index() == Int(0)

        # The number of external applications must be == 1. as a call is made to the Mod_contract to get the adoptionFee
        # Txn.applications[0] is a special index denoting the current app being interacted with
        valid_application_args = Txn.applications.length() == Int(1)

        # get fee from the mod contract
        self.getAdoptFee(Txn.applications[1])

        adoptFee_is_valid = App.globalGet(self.Variables.fee) > Int(0)

        valid_payment_to_seller = And(
            # The second transaction of the group must be the payment transaction.
            Gtxn[1].type_enum() == TxnType.Payment,
            # The receiver of the payment should be the creator of the app
            Gtxn[1].receiver() == Global.creator_address(),
            # The payment amount should match the product's price multiplied by the number of products bought
            Gtxn[1].amount() == App.globalGet(self.Variables.fee),
            # The sender of the payment transaction should match the sender of the smart contract call transaction.
            Gtxn[1].sender() == Gtxn[0].sender(),
        )

        can_adopt = And(valid_number_of_transacations, valid_transaction_order,
                        adoptFee_is_valid, valid_payment_to_seller, valid_application_args, )

        # The global state is updated using App.globalPut()
        update_state = Seq([
            App.globalPut(self.Variables.adopted, Int(1)),
            App.globalPut(self.Variables.owner, Txn.sender()),
            Approve()
        ])

        #  If the checks do not succeed, the transaction is rejected.
        return If(can_adopt).Then(update_state).Else(Reject())

    def testGetFee(self):
        return Seq([
            self.getAdoptFee(Txn.applications[1]),
            Approve(),
        ])

    # To delete a product.

    def application_deletion(self):
        return Return(Txn.sender() == Global.creator_address())

    # Check transaction conditions
    def application_start(self):
        return Cond(
            # checks if the application_id field of a transaction matches 0.
            # If this is the case, the application does not exist yet, and the application_creation() method is called
            [Txn.application_id() == Int(0), self.application_creation()],
            # If the the OnComplete action of the transaction is DeleteApplication, the application_deletion() method is called
            [Txn.on_completion() == OnComplete.DeleteApplication,
             self.application_deletion()],
            # if the irst argument of the transaction matches the AppMethods.buy value, the buy() method is called.
            [Txn.application_args[0] == self.AppMethods.adopt, self.adopt()],
            [Txn.application_args[0] == self.AppMethods.test, self.testGetFee()],
        )

    # The approval program is responsible for processing all application calls to the contract.
    def approval_program(self):
        return self.application_start()

    # The clear program is used to handle accounts using the clear call to remove the smart contract from their balance record.
    def clear_program(self):
        return Return(Int(1))
