import { DataSource } from 'typeorm';
import * as jwt from 'jsonwebtoken';

const AppDataSource = new DataSource({
    type: 'postgres',