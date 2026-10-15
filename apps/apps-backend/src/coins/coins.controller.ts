// Copyright (c) 2026 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    BadRequestException,
    Controller,
    DefaultValuePipe,
    Get,
    ParseEnumPipe,
    ParseIntPipe,
    Query,
    ServiceUnavailableException,
} from '@nestjs/common';
import { INDEXED_COIN_NETWORKS } from '@iota/core/constants/coins.constants';
import { Network } from '@iota/iota-sdk/client';

import { CoinsService } from './coins.service';
import { DEFAULT_COINS_LIMIT, MAX_COINS_LIMIT } from './coins.constants';
import { CoinsFilter, CoinsResponse, CoinsSort, CoinsSortOrder } from './coins.types';

@Controller('/coins')
export class CoinsController {
    constructor(private readonly coinsService: CoinsService) {}

    @Get('/')
    async getCoins(
        @Query('network') network: Network,
        @Query('filter', new DefaultValuePipe(CoinsFilter.All), new ParseEnumPipe(CoinsFilter))
        filter: CoinsFilter,
        @Query('search', new DefaultValuePipe('')) search: string,
        @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
        @Query('limit', new DefaultValuePipe(DEFAULT_COINS_LIMIT), ParseIntPipe) limit: number,
        @Query('sort', new ParseEnumPipe(CoinsSort, { optional: true })) sort:
            | CoinsSort
            | undefined,
        @Query('order', new DefaultValuePipe(CoinsSortOrder.Asc), new ParseEnumPipe(CoinsSortOrder))
        order: CoinsSortOrder,
    ): Promise<CoinsResponse> {
        if (!INDEXED_COIN_NETWORKS.includes(network)) {
            throw new BadRequestException(`Coins are not indexed for network "${network}"`);
        }

        const response = await this.coinsService.getCoins(network, {
            filter,
            search: search.trim(),
            offset: Math.max(offset, 0),
            limit: Math.min(Math.max(limit, 1), MAX_COINS_LIMIT),
            sort,
            order,
        });
        if (!response) {
            throw new ServiceUnavailableException('Coins are still being indexed');
        }
        return response;
    }
}
