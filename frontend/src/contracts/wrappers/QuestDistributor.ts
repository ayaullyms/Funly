import {
    Address,
    Cell,
    beginCell,
    contractAddress,
    storeStateInit,
    toNano,
    fromNano,
    type StateInit,
} from '@ton/core';


const COMPILED_HEX = 'b5ee9c724102150100039f000228ff008e88f4a413f4bcf2c80bed5320e303ed43d9010f020271020702015803050169b4a3bda89a1a400033df481a67fa401f401e808aa80d82b1c2df481020203ae01e809020203ae00aa6009a2aa04e005c5b678d8a30040002240169b6df3da89a1a400033df481a67fa401f401e808aa80d82b1c2df481020203ae01e809020203ae00aa6009a2aa04e005c5b678d8a3006000222020120080d020120090b0169b6d81da89a1a400033df481a67fa401f401e808aa80d82b1c2df481020203ae01e809020203ae00aa6009a2aa04e005c5b678d8a300a0008f8276f100169b72b1da89a1a400033df481a67fa401f401e808aa80d82b1c2df481020203ae01e809020203ae00aa6009a2aa04e005c5b678d8a300c0002230169b9718ed44d0d200019efa40d33fd200fa00f40455406c158e16fa40810101d700f404810101d700553004d155027002e2db3c6c5180e00022103ea3001d072d721d200d200fa4021103450666f04f86102f862ed44d0d200019efa40d33fd200fa00f40455406c158e16fa40810101d700f404810101d700553004d155027002e206925f06e004d70d1ff2e0822182104d5f7b8abae3022182107f5e4d3cbae302018210946a98b6bae3025f06f2c08210131402fe31d33f3082008aabf84225c705f2f481235a02b312f2f48200acd45112baf2f4821011e1a3008200d557f8276f105253a012bef2f47f247093216eb38ae85b227070810082036d6d50436d5033c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb004034111200e601206ef2d080d0fa40fa00d200820afaf080f8276f1026a15242a0be8e487071c87001cb1fc92510475520146d50436d5033c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb005033a059926c22e20192d43092306de201002ec87f01ca0055405045ce12cb3fca0001fa02f400c9ed5400d65b82008aabf84224c705f2f48200cab521b3f2f4227070810082036d6d50436d5033c8cf8580ca00cf8440ce01fa028069cf40025c6e016eb0935bcf819d58cf8680cf8480f400f400cf81e2f400c901fb004034c87f01ca0055405045ce12cb3fca0001fa02f400c9ed54009ed33f30c8018210aff90f5758cb1fcb3fc910354430f84270705003804201503304c8cf8580ca00cf8440ce01fa02806acf40f400c901fb00c87f01ca0055405045ce12cb3fca0001fa02f400c9ed54454f99563f30c8018210aff90f5758cb1fcb3fc910354430f84270705003804201503304c8cf8580ca00cf8440ce01fa02806acf40f400c901fb00c87f01ca0055405045ce12cb3fca0001fa02f400c9ed54454f9956';

export function getContractCode(): Cell {
    const hex = COMPILED_HEX;
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    
    const fixed = new Uint8Array(bytes.length);
    fixed.set(bytes.slice(0, bytes.length - 4));
    fixed[bytes.length - 4] = bytes[bytes.length - 1];
    fixed[bytes.length - 3] = bytes[bytes.length - 2];
    fixed[bytes.length - 2] = bytes[bytes.length - 3];
    fixed[bytes.length - 1] = bytes[bytes.length - 4];
    
    const base64 = btoa(String.fromCharCode(...fixed));
    return Cell.fromBase64(base64);
}

function crc32c(data: Uint8Array): number {
    let crc = 0xffffffff;
    for (let i = 0; i < data.length; i++) {
        crc ^= data[i];
        for (let j = 0; j < 8; j++) {
            crc = (crc >>> 1) ^ (crc & 1 ? 0x82f63b78 : 0);
        }
    }
    return (crc ^ 0xffffffff) >>> 0;
}

export interface WinnerEntry {
    address: string;  
    amount:  string;  
}

export interface DistributorParams {
    ownerAddress: string;
    winners:      WinnerEntry[];
    nonce?:       bigint;    
}

export interface DeployPayload {
    contractAddress: string;
    stateInitBase64: string;
    bodyBase64:      string;
    totalNano:       bigint;
}

export function buildWinnersCell(winners: WinnerEntry[]): Cell | null {
    if (winners.length === 0) return null;

    let current: Cell | null = null;

    for (let i = winners.length - 1; i >= 0; i--) {
        const addr = Address.parse(winners[i].address);
        const nano = toNano(winners[i].amount);

        const builder = beginCell()
            .storeAddress(addr)
            .storeCoins(nano);

        if (current !== null) {
            builder.storeBit(true).storeRef(current);
        } else {
            builder.storeBit(false);
        }

        current = builder.endCell();
    }

    return current;
}


export function buildContractData(
    owner:   Address,
    nonce:   bigint,
    winners: WinnerEntry[]
): Cell {
    const winnersCell = buildWinnersCell(winners);
    const totalNano   = winners.reduce((s, w) => s + toNano(w.amount), 0n);

    return beginCell()
        .storeAddress(owner)
        .storeUint(nonce, 64)
        .storeBit(false)         
        .storeCoins(totalNano)   
        .storeMaybeRef(winnersCell) 
        .endCell();
}

export function buildDistributeBody(nonce: bigint): Cell {
    return beginCell()
        .storeUint(0x4d5f7b8a, 32)
        .storeUint(nonce, 64)
        .endCell();
}

export function buildWithdrawBody(): Cell {
    return beginCell()
        .storeUint(0x7f5e4d3c, 32)
        .endCell();
}

const MAX_WINNERS = 30; 

export function buildDeployPayload(params: DistributorParams): DeployPayload {
    const { ownerAddress, winners } = params;
    const nonce = params.nonce ?? BigInt(Date.now());

    if (winners.length === 0)          throw new Error('Нет победителей');
    if (winners.length > MAX_WINNERS)  throw new Error(`Максимум ${MAX_WINNERS} победителей`);
    if (winners.some(w => !w.address)) throw new Error('У победителя нет кошелька');

    const owner = Address.parse(ownerAddress);
    const code  = getContractCode();
    const data  = buildContractData(owner, nonce, winners);

    const stateInit: StateInit = { code, data };

    const stateInitCell = beginCell()
        .store(storeStateInit(stateInit))
        .endCell();

    const body = buildDistributeBody(nonce);

    const contractAddr = contractAddress(0, stateInit);

    const totalNano =
        winners.reduce((sum, w) => sum + toNano(w.amount), 0n) +
        BigInt(winners.length) * toNano('0.05') +
        toNano('0.1');

    return {
        contractAddress: contractAddr.toString({ urlSafe: true, bounceable: true }),
        stateInitBase64: stateInitCell.toBoc({ crc32: false }).toString('base64'),
        bodyBase64:      body.toBoc({ crc32: false }).toString('base64'),
        totalNano,
    };
}


export function formatTon(nano: bigint | string | number): string {
    return Number(fromNano(nano.toString())).toFixed(2);
}

export function calcTotalTon(winners: WinnerEntry[]): string {
    const total = winners.reduce((s, w) => s + parseFloat(w.amount || '0'), 0);
    return total.toFixed(2);
}

export { MAX_WINNERS };