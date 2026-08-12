<?php

declare(strict_types=1);

namespace Api\Admin\Board\Repository;

use Api\Admin\Common\Repository\AdminBaseRepository;

final class AdminBoardWriteTableStore extends AdminBaseRepository
{
    public function create(string $boTable): void
    {
        $boardTable = $this->tables()->get('board');
        $targetWriteTable = $this->tables()->writeTable($boTable);
        $template = $this->fetchAssociative(
            "SELECT bo_table
             FROM {$boardTable}
             WHERE bo_table <> :bo_table
             ORDER BY bo_table ASC
             LIMIT 1",
            ['bo_table' => $boTable]
        );

        if (is_array($template) && is_string($template['bo_table'] ?? null)) {
            $templateWriteTable = $this->tables()->writeTable($template['bo_table']);
            $this->executeStatement("CREATE TABLE {$targetWriteTable} LIKE {$templateWriteTable}");
            return;
        }

        $this->executeStatement($this->canonicalCreateSql($targetWriteTable));
    }

    public function drop(string $boTable): void
    {
        $writeTable = $this->tables()->writeTable($boTable);
        $this->executeStatement("DROP TABLE IF EXISTS {$writeTable}");
    }

    private function canonicalCreateSql(string $writeTable): string
    {
        return "CREATE TABLE {$writeTable} (
            wr_id int(11) NOT NULL AUTO_INCREMENT,
            wr_num int(11) NOT NULL DEFAULT 0,
            wr_reply varchar(10) NOT NULL,
            wr_parent int(11) NOT NULL DEFAULT 0,
            wr_is_comment tinyint(4) NOT NULL DEFAULT 0,
            wr_comment int(11) NOT NULL DEFAULT 0,
            wr_comment_reply varchar(5) NOT NULL,
            ca_name varchar(255) NOT NULL,
            wr_option set('html1','html2','secret','mail') NOT NULL,
            wr_subject varchar(255) NOT NULL,
            wr_content text NOT NULL,
            wr_seo_title varchar(255) NOT NULL DEFAULT '',
            wr_link1 text NOT NULL,
            wr_link2 text NOT NULL,
            wr_link1_hit int(11) NOT NULL DEFAULT 0,
            wr_link2_hit int(11) NOT NULL DEFAULT 0,
            wr_hit int(11) NOT NULL DEFAULT 0,
            wr_good int(11) NOT NULL DEFAULT 0,
            wr_nogood int(11) NOT NULL DEFAULT 0,
            mb_id varchar(20) NOT NULL,
            wr_password varchar(255) NOT NULL,
            wr_name varchar(255) NOT NULL,
            wr_email varchar(255) NOT NULL,
            wr_homepage varchar(255) NOT NULL,
            wr_datetime datetime NOT NULL DEFAULT '0000-00-00 00:00:00',
            wr_file tinyint(4) NOT NULL DEFAULT 0,
            wr_last varchar(19) NOT NULL,
            wr_ip varchar(255) NOT NULL,
            wr_facebook_user varchar(255) NOT NULL,
            wr_twitter_user varchar(255) NOT NULL,
            wr_1 varchar(255) NOT NULL,
            wr_2 varchar(255) NOT NULL,
            wr_3 varchar(255) NOT NULL,
            wr_4 varchar(255) NOT NULL,
            wr_5 varchar(255) NOT NULL,
            wr_6 varchar(255) NOT NULL,
            wr_7 varchar(255) NOT NULL,
            wr_8 varchar(255) NOT NULL,
            wr_9 varchar(255) NOT NULL,
            wr_10 varchar(255) NOT NULL,
            PRIMARY KEY (wr_id),
            KEY wr_seo_title (wr_seo_title),
            KEY wr_num_reply_parent (wr_num, wr_reply, wr_parent),
            KEY wr_is_comment (wr_is_comment, wr_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8";
    }
}
