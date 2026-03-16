exports.up = function (pgm) {
    // 1. Template Header Table
    pgm.createTable('financial_report_templates', {
        id: { type: 'serial', primaryKey: true },
        code: { type: 'varchar(50)', notNull: true, unique: true },
        name: { type: 'varchar(255)', notNull: true },
        maint_language: { type: 'varchar(10)', default: 'EN' },
        chart_of_accounts_id: { type: 'integer', notNull: false },
        is_active: { type: 'boolean', default: true },
        created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
    });

    // 2. Report Template Nodes (The hierarchy)
    pgm.createTable('report_template_nodes', {
        id: { type: 'serial', primaryKey: true },
        template_id: {
            type: 'integer',
            notNull: true,
            references: '"financial_report_templates"',
            onDelete: 'CASCADE'
        },
        parent_node_id: {
            type: 'integer',
            notNull: false, // Null for root nodes
            references: '"report_template_nodes"',
            onDelete: 'CASCADE'
        },
        node_type: { type: 'varchar(50)', notNull: true }, // e.g., 'ROOT', 'ASSETS', 'LIABILITIES'
        name: { type: 'varchar(255)', notNull: true },
        sort_order: { type: 'integer', default: 0 },
        created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
    });

    // 3. Report Node Accounts (The GL Account mappings)
    pgm.createTable('report_node_accounts', {
        id: { type: 'serial', primaryKey: true },
        node_id: {
            type: 'integer',
            notNull: true,
            references: '"report_template_nodes"',
            onDelete: 'CASCADE'
        },
        from_account: { type: 'varchar(50)', notNull: true },
        to_account: { type: 'varchar(50)', notNull: true },
        balance_type: { type: 'varchar(20)', default: 'BOTH' }, // 'DEBIT_ONLY', 'CREDIT_ONLY', 'BOTH'
        created_at: { type: 'timestamp', default: pgm.func('current_timestamp') },
        updated_at: { type: 'timestamp', default: pgm.func('current_timestamp') }
    });

    pgm.createIndex('report_template_nodes', 'template_id');
    pgm.createIndex('report_template_nodes', 'parent_node_id');
    pgm.createIndex('report_node_accounts', 'node_id');
};

exports.down = function (pgm) {
    pgm.dropTable('report_node_accounts');
    pgm.dropTable('report_template_nodes');
    pgm.dropTable('financial_report_templates');
};
