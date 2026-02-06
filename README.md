# JuneERP - Complete Enterprise Resource Planning System

## Overview

JuneERP is a comprehensive Enterprise Resource Planning (ERP) system built with modern web technologies. This package contains the complete application with database, source code, and deployment tools.

## Features

### 📊 Complete Business Modules
- **Finance & Accounting** - AP/AR, GL, Banking, Cost Centers
- **Sales & Distribution** - Orders, Quotations, Pricing, Billing
- **Materials Management** - Inventory, Purchasing, Warehousing
- **Human Resources** - Employee Management, Payroll, Time Tracking
- **Production Planning** - BOMs, Work Centers, Production Orders

### 🤖 AI-Powered Features
- Intelligent business process monitoring
- Predictive analytics and forecasting
- Automated data quality validation
- Smart recommendations and insights

### 🏗️ Technical Architecture
- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + PostgreSQL
- **Database:** 248+ tables with complete business data
- **Security:** Role-based access control, audit trails
- **Performance:** Optimized queries, caching, real-time updates

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- 4GB RAM minimum
- 10GB disk space

### Installation

1. **Clone or extract this package**
2. **Set up database connection**
   ```bash
   export DATABASE_URL='postgresql://user:password@host:port/database'
   ```

3. **Run setup script**
   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

4. **Start the application**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open http://localhost:5173
   - Login: admin / admin

### Alternative Setup Methods

#### Windows
```cmd
setup.bat
```

#### Docker
```bash
docker-compose up
```

#### Manual Setup
```bash
npm install
cd database && ./restore.sh $DATABASE_URL && cd ..
cp .env.example .env
npm run dev
```

## Project Structure

```
JuneERP-Complete-Package/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── pages/         # Application pages and routes
│   │   ├── components/    # Reusable UI components
│   │   └── lib/          # Utilities and configurations
├── server/                # Node.js backend application
│   ├── routes/           # API route handlers
│   ├── storage.ts        # Database interface layer
│   └── server.ts         # Express server setup
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schema definitions
├── database/             # Complete database export
│   ├── 01-complete-schema.sql    # All 248+ table schemas
│   ├── 02-complete-data.sql      # Complete production data
│   └── restore.sh               # Database restoration script
├── setup.sh             # Complete application setup
├── package.json          # Node.js dependencies
└── README.md            # This file
```

## Database Information

- **Tables:** 248+ complete business tables
- **Records:** 8,894+ production records
- **Size:** ~2.6MB complete export
- **Features:** Full constraints, indexes, sequences

### Key Table Categories
- **Master Data:** Companies, customers, vendors, materials
- **Transactions:** Sales orders, invoices, payments, inventory
- **Configuration:** System settings, workflows, approvals
- **AI System:** Agent configs, analytics, monitoring

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run db:push` - Update database schema
- `npm run db:studio` - Open database admin

### Environment Configuration
Edit `.env` file for your specific setup:
- Database credentials
- API keys
- Feature flags
- Security settings

### Adding New Features
1. Define database schema in `shared/schema.ts`
2. Update storage interface in `server/storage.ts`
3. Create API routes in `server/routes.ts`
4. Build frontend components in `client/src/`

## Production Deployment

### Server Requirements
- **CPU:** 4+ cores
- **Memory:** 8GB+ RAM
- **Storage:** 50GB+ SSD
- **Database:** PostgreSQL 12+
- **SSL:** HTTPS certificate

### Deployment Steps
1. **Prepare production server**
2. **Set production environment variables**
3. **Run production setup**
   ```bash
   NODE_ENV=production ./setup.sh
   ```
4. **Configure reverse proxy (nginx)**
5. **Set up SSL certificates**
6. **Configure monitoring and backups**

### Docker Deployment
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Security

### Built-in Security Features
- Role-based access control
- Session management
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection

### Production Security Checklist
- [ ] Change default passwords
- [ ] Configure HTTPS
- [ ] Set secure session secrets
- [ ] Enable firewall
- [ ] Regular security updates
- [ ] Database backup encryption

## Support & Documentation

### Getting Help
- Check the troubleshooting section below
- Review error logs in `logs/` directory
- Consult API documentation
- Check database schema documentation

### Common Issues

#### Database Connection Errors
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT version();"
```

#### Permission Errors
```bash
# Fix file permissions
chmod +x setup.sh
chmod +x database/restore.sh
```

#### Port Conflicts
- Frontend runs on port 5173
- Backend runs on port 5000
- Database typically on port 5432

#### Memory Issues
- Increase Node.js memory: `node --max-old-space-size=4096`
- Check available system memory: `free -m`

## License

This software is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## Version Information

- **Version:** 1.0.0
- **Build Date:** 2025-06-11T18:29:12.231Z
- **Database Version:** 248 tables with complete production data
- **Node.js:** 18+ required
- **PostgreSQL:** 12+ required

---

**JuneERP Complete Package**  
*Enterprise Resource Planning System*  
*Ready for immediate deployment and production use*
