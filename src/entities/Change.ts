import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from "typeorm";

@Entity({ synchronize: false, name: "changes" })
export class Change extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "json", default: "{}" })
  values: object;

  @Column({ type: "json", default: "{}" })
  metadata: object;

  @Column({ type: "varchar" })
  database: string;

  @Column({ type: "varchar" })
  schema: string;

  @Column({ type: "varchar" })
  table: string;

  @Column({ type: "varchar" })
  operation: string;

  @Column({ type: "date", name: "committed_at" })
  committedAt: Date;

  @Column({ type: "date", name: "created_at" })
  createdAt: Date;

  @Column({ type: "date", name: "updated_at" })
  updatedAt: Date;
}
