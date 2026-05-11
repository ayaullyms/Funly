import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { QuestDistributor } from '../build/QuestDistributor/QuestDistributor_QuestDistributor';
import '@ton/test-utils';

describe('QuestDistributor', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let questDistributor: SandboxContract<QuestDistributor>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        questDistributor = blockchain.openContract(await QuestDistributor.fromInit());

        deployer = await blockchain.treasury('deployer');

        const deployResult = await questDistributor.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            null,
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: questDistributor.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and questDistributor are ready to use
    });
});
