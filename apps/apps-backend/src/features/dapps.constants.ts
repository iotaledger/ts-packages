// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

export interface RecognizedDapp {
    name: string;
    link: string;
    description: string;
    icon: string;
    tags?: string[];
}

export const RECOGNIZED_DAPPS: RecognizedDapp[] = [
    {
        name: 'Wallet Dashboard',
        link: 'https://wallet-dashboard.iota.org/',
        description:
            'IOTA Wallet Dashboard - Connecting you to the decentralized web and IOTA network',
        icon: 'https://iota.org/logo.png',
        tags: ['Official', 'Utility'],
    },
    {
        name: 'IOTA Names',
        link: 'https://iotanames.com/',
        description: 'Own a unique, human-readable name on IOTA',
        icon: 'https://files.iota.org/media/tooling/dapps/iotanames-logo.png',
        tags: ['Official', 'Utility'],
    },
    {
        name: 'EVM Bridge',
        link: 'https://evm-bridge.iota.org/',
        description:
            'Seamlessly transfer funds between IOTA and IOTA EVM networks. A secure and efficient bridge for moving assets across Layer 1 and Layer 2',
        icon: 'https://iota.org/logo.png',
        tags: ['Official', 'EVM', 'Bridge'],
    },
    {
        name: 'Swirl',
        link: 'https://swirlstake.com/',
        description:
            'Effortlessly stake your IOTA with SWIRL and maximize your rewards. Enjoy the benefits of liquid staking while keeping full control of your assets',
        icon: 'https://files.iota.org/media/tooling/dapps/swirlstake-logo.png',
        tags: ['DeFi', 'LST'],
    },
    {
        name: 'TokenLabs',
        link: 'https://tokenlabs.network/',
        description:
            'Official IOTA Rebased validator providing secure staking services, educational resources, and blockchain tools for the IOTA community',
        icon: 'https://files.iota.org/media/tooling/dapps/tokenlabs-logo.png',
        tags: ['DeFi', 'LST'],
    },
    {
        name: 'Virtue',
        link: 'https://virtue.money/',
        description:
            'Virtue is a decentralized stablecoin protocol on IOTA, enabling users to borrow VUSD—a USD-pegged stablecoin—at a fixed interest rate',
        icon: 'https://files.iota.org/media/tooling/dapps/virtue-logo.png',
        tags: ['DeFi', 'CDP'],
    },
    {
        name: 'Pools',
        link: 'https://pools.finance/',
        description:
            'The leading DEX on IOTA. Swap tokens with low fees, add liquidity to Pools, and earn rewards from Farms with your LP tokens',
        icon: 'https://files.iota.org/media/tooling/dapps/pools-logo.png',
        tags: ['DeFi', 'DEX'],
    },
    {
        name: 'Cyberperp',
        link: 'https://cyberperp.io/',
        description: 'The First Decentralized Perpetual Exchange on Iota EVM',
        icon: 'https://files.iota.org/media/tooling/dapps/cyberperp-logo.png',
        tags: ['DeFi', 'EVM', 'DEX'],
    },
    {
        name: 'Houdini Swap',
        link: 'https://houdiniswap.com/',
        description:
            'Crypto’s best compliant privacy. Swap non-custodially across 100+ chains. Transact Freely. Stay Private',
        icon: 'https://files.iota.org/media/tooling/dapps/houdiniswap-logo.svg',
        tags: ['DeFi', 'DEX'],
    },
    {
        name: 'Tradeport',
        link: 'https://tradeport.xyz/',
        description:
            'TradePort is the leading NFT marketplace and developer platform on Sui, Movement, Aptos, Supra, NEAR, and Stacks. Trade and create NFTs, or build  apps with our API and SDKs',
        icon: 'https://files.iota.org/media/tooling/dapps/tradeport-logo.svg',
        tags: ['NFT'],
    },
    {
        name: 'Stargate',
        link: 'https://stargate.finance/',
        description: 'Omnichain liquidity bridge connecting IOTA EVM to other networks',
        icon: 'https://files.iota.org/media/tooling/dapps/stargate-logo.svg',
        tags: ['DeFi', 'EVM', 'Bridge'],
    },
    {
        name: 'Echo Protocol',
        link: 'https://echo-protocol.xyz/',
        description: 'Cross-chain bridge and DeFi protocol on IOTA EVM',
        icon: 'https://files.iota.org/media/tooling/dapps/echo-protocol-logo.svg',
        tags: ['DeFi', 'EVM', 'Bridge'],
    },
    {
        name: 'LiquidLink',
        link: 'https://iota.liquidlink.io/',
        description:
            'Connect your wallet to access LiquidLink dashboards, manage incentive programs, and track cross-chain community performance',
        icon: 'https://files.iota.org/media/tooling/dapps/liquidlink-logo.png',
        tags: ['DeFi', 'Utility'],
    },
    {
        name: 'IOTA Gives',
        link: 'https://iota.gives/',
        description:
            'Send and receive IOTA gifts easily. Create custom giveaways, airdrops, and share crypto with your community on the IOTA network',
        icon: 'https://files.iota.org/media/tooling/dapps/iotagives-logo.svg',
        tags: ['Utility'],
    },
];
