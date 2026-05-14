import "@stdlib/deploy";

message(0x4d5f7b8a) Distribute { nonce: Int as uint64; }
message(0x7f5e4d3c) EmergencyWithdraw {}

contract QuestDistributor {
    owner: Address;
    nonce: Int as uint64;
    distributed: Bool;
    winners: Cell?;

    init(owner: Address, nonce: Int, winners: Cell?) {
        self.owner = owner;
        self.nonce = nonce;
        self.distributed = false;
        self.winners = winners;
    }

    receive(msg: Distribute) {
        require(msg.nonce == self.nonce, "Invalid nonce");
        require(sender() == self.owner, "Only owner");
        require(!self.distributed, "Already distributed");

        self.distributed = true;

        let node: Cell? = self.winners;
        while (node != null) {
            let s: Slice = node!!.beginParse();
            let addr: Address = s.loadAddress();
            let amount: Int = s.loadCoins();
            let hasNext: Bool = s.loadBool();
            send(SendParameters{ to: addr, value: amount, bounce: false, mode: 0 });
            if (hasNext) { node = s.loadRef(); } else { node = null; }
        }

        send(SendParameters{
            to: self.owner, value: 0, bounce: false,
            mode: SendRemainingBalance | SendIgnoreErrors
        });
    }

    receive(msg: EmergencyWithdraw) {
        require(sender() == self.owner, "Only owner");
        send(SendParameters{
            to: self.owner, value: 0, bounce: false,
            mode: SendRemainingBalance | SendIgnoreErrors
        });
    }

    get fun isDistributed(): Bool { return self.distributed; }
    get fun balance(): Int { return myBalance(); }
    get fun owner(): Address { return self.owner; }
}