from pyteal import *

# algosandbox goal app create --creator $acc1 --approval-prog contracts/petshop_approval.teal --clear-prog contracts/petshop_clear.teal --note pet-shop:uPets --global-byteslices 5 --global-ints 2 --local-byteslices 0 --local-ints 0 --app-arg str:TestPet --app-arg str:TestImage --app-arg int:5 --app-arg str:TestBreed --app-arg str:TestLocation


class Pet:
    class Variables:
        name = Bytes("NAME")  # ByteSlice
        image = Bytes("IMAGE")  # ByteSlice
        age = Bytes("AGE")  # ByteSlice
        breed = Bytes("BREED")  # ByteSlice
        location = Bytes("LOCATION")  # ByteSlice
        adopted = Bytes("ADOPTED")  # Uint64 0 means false, 1 means true
        owner = Bytes("OWNER")  # ByteSlice
        fee = Bytes("ADOPT_FEE")  # Uint64

    class AppMethods:
        adopt = Bytes("adopt")

    # to create a new pet listed for adoption
    def application_creation(self):
        return Seq([
            # The number of arguments attached to the transaction should be exactly 6.
            Assert(Txn.application_args.length() == Int(6)),

            # The note attached to the transaction must be "tutorial-marketplace:uv1", which we define to be the note that marks a product within our marketplace
            Assert(Txn.note() == Bytes("pet-shop:uPetsv2")),

            # Store the transaction arguments into the applications's global's state
            App.globalPut(self.Variables.name, Txn.application_args[0]),
            App.globalPut(self.Variables.image, Txn.application_args[1]),
            App.globalPut(self.Variables.age, Txn.application_args[2]),
            App.globalPut(self.Variables.breed, Txn.application_args[3]),
            App.globalPut(self.Variables.location, Txn.application_args[4]),
            App.globalPut(self.Variables.adopted, Int(0)),
            App.globalPut(self.Variables.owner, Txn.application_args[5]),

            Approve(),
        ])

    # get adoption fee from mod contract
    def getAdoptFee(self, mod_contract: Expr):
        # gets fee from mod_contract
        get_global_fee = App.globalGetEx(mod_contract, Bytes("FEE"))

        return Seq(
            get_global_fee,
            If(get_global_fee.hasValue(),  App.globalPut(self.Variables.fee,
               get_global_fee.value()), App.globalPut(self.Variables.fee, Int(0))),
        )

    def adopt(self):
        scratch_adopter = ScratchVar(TealType.bytes)

        return Seq([
            scratch_adopter.store(App.globalGet(self.Variables.owner)),
            # first sanity checks to check transaction params
            Assert(
                And(
                    # The number of transactions within the group transaction must be exactly 2.
                    # first one being the adopt function and the second being the payment transactions
                    Global.group_size() == Int(2),

                    # check that the adopt call is made ahead of the payment transaction
                    Txn.group_index() == Int(0),

                    # The number of external applications must be == 1. as a call is made to the Mod_contract to get the adoptionFee
                    # Txn.applications[0] is a special index denoting the current app being interacted with
                    Txn.applications.length() == Int(1),

                    # The number of arguments attached to the transaction should be exactly 2.
                    Txn.application_args.length() == Int(2),

                    # Check that current owner is not the transaction sender as that's redundant
                    scratch_adopter.load() != Txn.application_args[1],
                ),
            ),

            # get fee from the mod contract
            self.getAdoptFee(Txn.applications[1]),

            # checks for second transaction
            Assert(
                And(
                    # check if fee is greater is zero
                    App.globalGet(self.Variables.fee) > Int(0),
                    # The second transaction of the group must be the payment transaction.
                    Gtxn[1].type_enum() == TxnType.Payment,
                    # The receiver of the payment should be the creator of the app
                    Gtxn[1].receiver() == Global.creator_address(),
                    # The payment amount should match the product's price multiplied by the number of products bought
                    Gtxn[1].amount() == App.globalGet(self.Variables.fee),
                    # The sender of the payment transaction should match the sender of the smart contract call transaction.
                    Gtxn[1].sender() == Gtxn[0].sender(),
                )
            ),

            # The global state is updated using App.globalPut()

            App.globalPut(self.Variables.adopted, Int(1)),
            App.globalPut(self.Variables.owner, Txn.application_args[1]),
            Approve()

        ])

    # To delete a product.

    def application_deletion(self):
        scratch_owner = ScratchVar(TealType.bytes)
        return Seq(
            scratch_owner.store(App.globalGet(self.Variables.owner)),
            # The number of arguments attached to the transaction should be exactly 1.
            Assert(Txn.application_args.length() == Int(1)),
            Return(
                scratch_owner.load() == Txn.application_args[0],
            ),
        )

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
        )

    # The approval program is responsible for processing all application calls to the contract.
    def approval_program(self):
        return self.application_start()

    # The clear program is used to handle accounts using the clear call to remove the smart contract from their balance record.
    def clear_program(self):
        return Return(Int(1))
