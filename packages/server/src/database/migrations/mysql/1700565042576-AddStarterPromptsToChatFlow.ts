import { MigrationInterface, QueryRunner } from 'typeorm'

export class AddStarterPrompt1700565042576 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const columnExists = await queryRunner.hasColumn('chat_flow', 'starterPrompt')
        if (!columnExists) queryRunner.query(`ALTER TABLE \`chat_flow\` ADD COLUMN \`starterPrompt\` TEXT;`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`chat_flow\` DROP COLUMN \`starterPrompt\`;`)
    }
}
