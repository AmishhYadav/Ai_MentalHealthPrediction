# Health Analytics Feature Documentation

## Overview
The Health Analytics feature provides comprehensive weekly and monthly analysis of users' mental health data, including trends, insights, and personalized recommendations based on their daily assessments and summaries.

## Features

### 📊 Weekly Analytics
- **Time Range**: Monday to Sunday of the selected week
- **Data Sources**: Daily assessments + daily summaries
- **Analysis**: Mood, stress, sleep, and energy trends
- **AI Insights**: Clinical analysis and recommendations

### 📅 Monthly Analytics  
- **Time Range**: Full calendar month
- **Data Sources**: All assessments and summaries for the month
- **Analysis**: Comprehensive monthly patterns and trends
- **AI Insights**: Long-term health trajectory analysis

## API Endpoints

### Weekly Analytics
```
GET /api/mentalhealth/analytics/weekly?weekStart=YYYY-MM-DD
```

**Parameters:**
- `weekStart` (optional): Start date of the week (defaults to current week)

**Response:**
```json
{
  "message": "Weekly analytics retrieved successfully",
  "weekStart": "2024-01-15",
  "weekEnd": "2024-01-21", 
  "assessments": [...],
  "summaries": [...],
  "analytics": {
    "summary": "Weekly health summary...",
    "trends": "Trend analysis...",
    "insights": "Key insights...",
    "recommendations": ["Rec 1", "Rec 2", ...],
    "riskLevel": "Low|Medium|High",
    "moodTrend": "Improving|Declining|Stable",
    "stressTrend": "Improving|Declining|Stable", 
    "sleepTrend": "Improving|Declining|Stable",
    "energyTrend": "Improving|Declining|Stable",
    "timestamp": "2024-01-21T10:30:00Z"
  }
}
```

### Monthly Analytics
```
GET /api/mentalhealth/analytics/monthly?month=1&year=2024
```

**Parameters:**
- `month` (optional): Month number 1-12 (defaults to current month)
- `year` (optional): Year (defaults to current year)

**Response:**
```json
{
  "message": "Monthly analytics retrieved successfully",
  "month": 1,
  "year": 2024,
  "monthStart": "2024-01-01",
  "monthEnd": "2024-01-31",
  "assessments": [...],
  "summaries": [...],
  "analytics": {
    "summary": "Monthly health summary...",
    "trends": "Monthly trend analysis...",
    "insights": "Key monthly insights...",
    "recommendations": ["Rec 1", "Rec 2", ...],
    "riskLevel": "Low|Medium|High",
    "moodTrend": "Improving|Declining|Stable",
    "stressTrend": "Improving|Declining|Stable",
    "sleepTrend": "Improving|Declining|Stable", 
    "energyTrend": "Improving|Declining|Stable",
    "timestamp": "2024-01-31T10:30:00Z"
  }
}
```

## Frontend Components

### Analytics Component
- **Location**: `mental-health/src/app/analytics/`
- **Route**: `/analytics`
- **Features**:
  - Tabbed interface (Weekly/Monthly)
  - Date selection controls
  - Trend indicators with visual icons
  - Risk level badges
  - Comprehensive recommendations
  - Export functionality

### Navigation Integration
- **Navbar**: Added "Analytics" link
- **Profile**: Added "Health Analytics" action button
- **Routing**: Protected route requiring authentication

## AI Analysis Engine

### Python Script
- **Location**: `AI_ENV/analyze_weekly_monthly.py`
- **Function**: Generates comprehensive health analysis using Gemini AI
- **Input**: Assessment data + daily summaries
- **Output**: Structured JSON with trends, insights, and recommendations

### Analysis Features
- **Trend Calculation**: Linear regression analysis for mood, stress, sleep, energy
- **Statistical Analysis**: Averages, ranges, risk distribution
- **Clinical Insights**: Evidence-based psychological assessment
- **Personalized Recommendations**: Actionable advice based on patterns

## Data Flow

1. **User Access**: Navigate to `/analytics` page
2. **Date Selection**: Choose week/month to analyze
3. **Data Retrieval**: Backend fetches assessments and summaries
4. **AI Processing**: Python script analyzes data with Gemini AI
5. **Response**: Structured analytics returned to frontend
6. **Display**: User sees trends, insights, and recommendations

## Usage Examples

### Weekly Analysis
```typescript
// Get current week analytics
this.mentalHealthService.getWeeklyAnalytics().subscribe(data => {
  console.log('Weekly trends:', data.analytics.trends);
  console.log('Mood trend:', data.analytics.moodTrend);
});

// Get specific week analytics
this.mentalHealthService.getWeeklyAnalytics('2024-01-15').subscribe(data => {
  console.log('Week of Jan 15:', data.analytics.summary);
});
```

### Monthly Analysis
```typescript
// Get current month analytics
this.mentalHealthService.getMonthlyAnalytics().subscribe(data => {
  console.log('Monthly insights:', data.analytics.insights);
});

// Get specific month analytics
this.mentalHealthService.getMonthlyAnalytics(1, 2024).subscribe(data => {
  console.log('January 2024:', data.analytics.summary);
});
```

## Styling

### Design System
- **Gradient Backgrounds**: Purple/blue gradient theme
- **Glass Morphism**: Semi-transparent cards with blur effects
- **Trend Icons**: Color-coded arrows (green=improving, red=declining, blue=stable)
- **Risk Badges**: Color-coded risk levels (green=low, yellow=medium, red=high)
- **Responsive Design**: Mobile-friendly layout

### CSS Classes
- `.gradient-text`: Gradient text effect
- `.card`: Glass morphism card styling
- `.trend-icon`: Trend indicator styling
- `.risk-badge`: Risk level badge styling

## Testing

### Backend Testing
```bash
# Test API endpoints
node test_analytics_api.js

# Test with specific data
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/mentalhealth/analytics/weekly
```

### Frontend Testing
1. Start backend: `cd base && npm start`
2. Start frontend: `cd mental-health && ng serve`
3. Navigate to: `http://localhost:4200/analytics`
4. Login and test both weekly and monthly views

## Error Handling

### Backend Errors
- **No Data**: Returns default "no data" analytics
- **API Failures**: Graceful fallback with error messages
- **Invalid Dates**: Validation and error responses

### Frontend Errors
- **Loading States**: Spinner and loading messages
- **Error States**: User-friendly error alerts
- **Empty States**: Guidance to take assessments

## Performance Considerations

### Data Optimization
- **Pagination**: Limits assessment retrieval
- **Caching**: Frontend caches analytics data
- **Lazy Loading**: Components load data on demand

### AI Processing
- **Async Processing**: Non-blocking AI analysis
- **Timeout Handling**: 30-second timeout for AI requests
- **Error Recovery**: Fallback responses for AI failures

## Security

### Authentication
- **JWT Required**: All endpoints require valid JWT token
- **User Isolation**: Users only see their own data
- **Input Validation**: Date parameters validated

### Data Privacy
- **No Data Storage**: AI analysis not stored permanently
- **Secure Transmission**: HTTPS for all API calls
- **Token Expiry**: 24-hour JWT token lifetime

## Future Enhancements

### Planned Features
- **Charts & Graphs**: Visual trend representations
- **Comparative Analysis**: Week-over-week, month-over-month
- **Goal Setting**: User-defined health goals
- **Notifications**: Trend-based alerts and reminders
- **Export Options**: PDF reports and data exports

### Technical Improvements
- **Real-time Updates**: WebSocket integration
- **Advanced Analytics**: Machine learning insights
- **Mobile App**: React Native implementation
- **API Versioning**: Backward compatibility

## Troubleshooting

### Common Issues

1. **"No Data Available"**
   - Ensure user has taken daily assessments
   - Check date range selection
   - Verify database connection

2. **"Analysis Failed"**
   - Check Python environment setup
   - Verify Gemini API key
   - Check server logs for errors

3. **"Loading Forever"**
   - Check network connection
   - Verify backend server is running
   - Check browser console for errors

### Debug Commands
```bash
# Check backend logs
cd base && npm start

# Check Python environment
cd AI_ENV && python analyze_weekly_monthly.py

# Test API directly
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/mentalhealth/analytics/weekly
```

## Support

For issues or questions:
1. Check this documentation
2. Review server logs
3. Test API endpoints directly
4. Check browser console for frontend errors

---

**Last Updated**: January 2024
**Version**: 1.0.0
**Status**: Production Ready
