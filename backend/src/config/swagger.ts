import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Competition Account Management API',
      version: '1.0.0',
      description: 'REST API for managing golf competition transactions, competitions, and financial summaries',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.example.com',
        description: 'Production server',
      },
    ],
    components: {
      schemas: {
        TransactionRecord: {
          type: 'object',
          required: ['date', 'time', 'type', 'total'],
          properties: {
            id: {
              type: 'integer',
              description: 'Transaction ID',
              example: 1,
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Transaction date in ISO 8601 format (YYYY-MM-DD)',
              example: '2024-01-15',
            },
            time: {
              type: 'string',
              description: 'Transaction time in HH:MM:SS format',
              example: '14:30:00',
            },
            till: {
              type: 'string',
              description: 'Till identifier',
              example: 'TILL1',
            },
            type: {
              type: 'string',
              description: 'Transaction type',
              example: 'Sale',
            },
            member: {
              type: 'string',
              description: 'Member field (may contain player and competition info)',
              example: 'John Doe & Weekly Medal: Entry',
            },
            player: {
              type: 'string',
              description: 'Extracted player name',
              example: 'John Doe',
            },
            competition: {
              type: 'string',
              description: 'Extracted competition name',
              example: 'Weekly Medal',
            },
            price: {
              type: 'string',
              description: 'Price value',
              example: '10.00',
            },
            discount: {
              type: 'string',
              description: 'Discount value',
              example: '0.00',
            },
            subtotal: {
              type: 'string',
              description: 'Subtotal value',
              example: '10.00',
            },
            vat: {
              type: 'string',
              description: 'VAT value',
              example: '2.00',
            },
            total: {
              type: 'string',
              description: 'Total value',
              example: '12.00',
            },
            sourceRowIndex: {
              type: 'integer',
              description: 'Source row index from CSV',
              example: 5,
            },
            isComplete: {
              type: 'boolean',
              description: 'Whether the record is complete',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Record creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Record update timestamp',
            },
          },
        },
        Competition: {
          type: 'object',
          required: ['name', 'date'],
          properties: {
            id: {
              type: 'integer',
              description: 'Competition ID',
              example: 1,
            },
            name: {
              type: 'string',
              description: 'Competition name',
              example: 'Weekly Medal',
            },
            date: {
              type: 'string',
              format: 'date',
              description: 'Competition date in ISO 8601 format (YYYY-MM-DD)',
              example: '2024-01-15',
            },
            description: {
              type: 'string',
              description: 'Competition description',
              example: 'Weekly medal competition',
            },
            prizeStructure: {
              type: 'string',
              description: 'Prize structure details',
              example: '1st: £50, 2nd: £30, 3rd: £20',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Record creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Record update timestamp',
            },
          },
        },
        FlaggedTransaction: {
          type: 'object',
          required: ['transactionId'],
          properties: {
            id: {
              type: 'integer',
              description: 'Flagged transaction ID',
              example: 1,
            },
            transactionId: {
              type: 'integer',
              description: 'Associated transaction ID',
              example: 42,
            },
            competitionId: {
              type: 'integer',
              nullable: true,
              description: 'Associated competition ID (nullable)',
              example: 5,
            },
            flaggedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the transaction was flagged',
            },
            transaction: {
              $ref: '#/components/schemas/TransactionRecord',
            },
            competition: {
              $ref: '#/components/schemas/Competition',
              nullable: true,
            },
          },
        },
        WeeklySummary: {
          type: 'object',
          properties: {
            fromDate: {
              type: 'string',
              format: 'date',
              description: 'Week start date (Monday)',
              example: '2024-01-15',
            },
            toDate: {
              type: 'string',
              format: 'date',
              description: 'Week end date (Sunday)',
              example: '2024-01-21',
            },
            startingPurse: {
              type: 'number',
              description: 'Starting purse balance',
              example: 100.50,
            },
            purseApplicationTopUp: {
              type: 'number',
              description: 'Purse application top-up amount',
              example: 50.00,
            },
            purseTillTopUp: {
              type: 'number',
              description: 'Purse till top-up amount',
              example: 25.00,
            },
            competitionEntries: {
              type: 'number',
              description: 'Competition entries total',
              example: 150.00,
            },
            competitionRefunds: {
              type: 'number',
              description: 'Competition refunds total',
              example: -10.00,
            },
            finalPurse: {
              type: 'number',
              description: 'Final purse balance',
              example: 315.50,
            },
            startingPot: {
              type: 'number',
              description: 'Starting pot balance',
              example: 200.00,
            },
            winningsPaid: {
              type: 'number',
              description: 'Winnings paid out',
              example: -75.00,
            },
            competitionCosts: {
              type: 'number',
              description: 'Competition costs',
              example: -25.00,
            },
            finalPot: {
              type: 'number',
              description: 'Final pot balance',
              example: 100.00,
            },
          },
        },
        ImportResult: {
          type: 'object',
          properties: {
            imported: {
              type: 'integer',
              description: 'Number of records successfully imported',
              example: 150,
            },
            errors: {
              type: 'array',
              description: 'Import errors',
              items: {
                type: 'object',
                properties: {
                  record: {
                    $ref: '#/components/schemas/TransactionRecord',
                  },
                  message: {
                    type: 'string',
                    example: 'Invalid date format',
                  },
                },
              },
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Validation failed',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
          },
        },
        PaginationMetadata: {
          type: 'object',
          properties: {
            total: {
              type: 'integer',
              description: 'Total number of records',
              example: 1500,
            },
            page: {
              type: 'integer',
              description: 'Current page number (1-indexed)',
              example: 1,
            },
            pageSize: {
              type: 'integer',
              description: 'Number of records per page',
              example: 100,
            },
            totalPages: {
              type: 'integer',
              description: 'Total number of pages',
              example: 15,
            },
          },
        },
        PaginatedTransactionResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/TransactionRecord',
              },
            },
            pagination: {
              $ref: '#/components/schemas/PaginationMetadata',
            },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'ok',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            version: {
              type: 'string',
              example: '1.0.0',
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes
};

export const swaggerSpec = swaggerJsdoc(options);
