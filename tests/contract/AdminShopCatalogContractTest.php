<?php

declare(strict_types=1);

namespace Tests\Contract;

final class AdminShopCatalogContractTest extends ContractTestCase
{
    public function testStockSmsMutationContractsAreDocumented(): void
    {
        $this->assertMethodHasOperationId(
            '/admin/shop/catalog/stocksms/{stock_sms_id}',
            'patch',
            'adminUpdateShopCatalogStockSms'
        );
        $this->assertMethodHasOperationId(
            '/admin/shop/catalog/stocksms/{stock_sms_id}',
            'delete',
            'adminDeleteShopCatalogStockSms'
        );
        $this->assertMethodHasOperationId(
            '/admin/shop/catalog/stocksms/{stock_sms_id}/send',
            'post',
            'adminSendShopCatalogStockSms'
        );
        $this->assertMethodHasParameters(
            '/admin/shop/catalog/stocksms/{stock_sms_id}/send',
            'post',
            ['stock_sms_id']
        );
        $this->assertMethodHasResponseStatus(
            '/admin/shop/catalog/stocksms/{stock_sms_id}/send',
            'post',
            '200'
        );
    }
}
