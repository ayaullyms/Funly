import { toNano } from '@ton/core';
import { QuestDistributor } from '../build/QuestDistributor/QuestDistributor_QuestDistributor';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const questDistributor = provider.open(await QuestDistributor.fromInit());

    await questDistributor.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        null,
    );

    await provider.waitForDeploy(questDistributor.address);

    // run methods on `questDistributor`
}
