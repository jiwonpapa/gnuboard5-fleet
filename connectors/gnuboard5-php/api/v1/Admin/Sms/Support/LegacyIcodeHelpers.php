<?php

declare(strict_types=1);

if (!function_exists('iconv_utf8')) {
    function iconv_utf8(string $str): string
    {
        return iconv('euc-kr', 'utf-8', $str) ?: $str;
    }
}

if (!function_exists('iconv_euckr')) {
    function iconv_euckr(string $str): string
    {
        return iconv('utf-8', 'euc-kr', $str) ?: $str;
    }
}
