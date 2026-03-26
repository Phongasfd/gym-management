# Gym Management System

A web application for managing gym operations including member registration, class bookings, check-ins, and staff management.

## Tech Stack

- **Backend**: Node.js, Express, Prisma, PostgreSQL
- **Frontend Admin**: React, Vite
- **Frontend User**: Next.js
- **Infrastructure**: Docker, Docker Compose, Nginx, Redis

## Quick Start

1. **Clone the repository**

   ```bash
   git clone https://github.com/Phongasfd/gym-management.git
   cd gym-management
   ```

2. **Start development environment**

   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

3. **Access the application**
   - Admin Dashboard: http://localhost:5173
   - User Portal: http://localhost:3001
   - API: http://localhost:3000

## Deployment

The project is deployed on AWS EC2 free tier with self-signed SSL certificates.

For production deployment:

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

## Features

- Member management and subscriptions
- Class scheduling and booking
- Check-in tracking
- Payment integration (VNPay)
- Admin dashboard
- User portal

### Detailed Features

#### User Management

- User registration and authentication (JWT-based)
- Role-based access control (Admin, Staff, Member)
- Profile management and password reset
- Email notifications for account activities

#### Member Portal

- Class browsing and booking system
- Personal dashboard with booking history
- Subscription management and renewal
- Payment processing through VNPay
- Check-in functionality for gym visits

#### Admin Dashboard

- Staff management (add, edit, remove staff members)
- Member oversight and analytics
- Class scheduling and management
- Package and subscription configuration
- Booking management and conflict resolution
- Check-in monitoring and reporting

#### Class Management

- Create and schedule gym classes
- Capacity management and booking limits
- Class categories and instructor assignment
- Real-time availability updates

#### Payment & Subscriptions

- Multiple subscription packages
- Automated billing and renewal reminders
- VNPay integration for secure payments
- Payment history and receipts

#### AI Integration

- AI-powered recommendations and insights

#### System Features

- Rate limiting for API security
- Comprehensive logging and error handling
- Redis caching for performance
- Docker containerization for easy deployment
- Database migrations with Prisma
