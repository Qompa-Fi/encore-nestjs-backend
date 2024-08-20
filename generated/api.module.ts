import { DynamicModule, Module, Global, Provider } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { AsyncConfiguration, Configuration, ConfigurationFactory } from './configuration';

import { AccountHoldsService } from './api/accountHolds.service';
import { AccountsService } from './api/accounts.service';
import { CardsService } from './api/cards.service';
import { InternalTransfersService } from './api/internalTransfers.service';
import { LedgerAccountsService } from './api/ledgerAccounts.service';
import { LoansService } from './api/loans.service';
import { PartiesService } from './api/parties.service';
import { ProductsService } from './api/products.service';
import { RelationshipsService } from './api/relationships.service';
import { TransactionsService } from './api/transactions.service';

@Global()
@Module({
  imports:      [ HttpModule ],
  exports:      [
    AccountHoldsService,
    AccountsService,
    CardsService,
    InternalTransfersService,
    LedgerAccountsService,
    LoansService,
    PartiesService,
    ProductsService,
    RelationshipsService,
    TransactionsService
  ],
  providers: [
    AccountHoldsService,
    AccountsService,
    CardsService,
    InternalTransfersService,
    LedgerAccountsService,
    LoansService,
    PartiesService,
    ProductsService,
    RelationshipsService,
    TransactionsService
  ]
})
export class ApiModule {
    public static forRoot(configurationFactory: () => Configuration): DynamicModule {
        return {
            module: ApiModule,
            providers: [ { provide: Configuration, useFactory: configurationFactory } ]
        };
    }

    /**
     * Register the module asynchronously.
     */
    static forRootAsync(options: AsyncConfiguration): DynamicModule {
        const providers = [...this.createAsyncProviders(options)];
        return {
            module: ApiModule,
            imports: options.imports || [],
            providers,
            exports: providers,
        };
    }

    private static createAsyncProviders(options: AsyncConfiguration): Provider[] {
        if (options.useClass) {
            return [
                this.createAsyncConfigurationProvider(options),
                {
                    provide: options.useClass,
                    useClass: options.useClass,
                },
            ];
        }
        return [this.createAsyncConfigurationProvider(options)];
    }

    private static createAsyncConfigurationProvider(
        options: AsyncConfiguration,
    ): Provider {
        if (options.useFactory) {
            return {
                provide: Configuration,
                useFactory: options.useFactory,
                inject: options.inject || [],
            };
        }
        return {
            provide: Configuration,
            useFactory: async (optionsFactory: ConfigurationFactory) =>
                await optionsFactory.createConfiguration(),
            inject: (options.useExisting && [options.useExisting]) || (options.useClass && [options.useClass]) || [],
        };
    }

    constructor( httpService: HttpService) { }
}
