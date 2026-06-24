#!/bin/bash
# Quick Validation Script for Smart Connect

echo "==================================="
echo "Smart Connect - Quick Validation"
echo "==================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Check Node version
echo -e "${YELLOW}[1/5]${NC} Checking Node.js version..."
node_version=$(node -v)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Node.js $node_version installed"
else
    echo -e "${RED}✗${NC} Node.js not found!"
fi
echo ""

# 2. Check Backend structure
echo -e "${YELLOW}[2/5]${NC} Checking Backend structure..."
if [ -f "Backend/package.json" ] && [ -f "Backend/index.js" ]; then
    echo -e "${GREEN}✓${NC} Backend files found"
else
    echo -e "${RED}✗${NC} Backend files missing!"
fi
echo ""

# 3. Check Frontend structure
echo -e "${YELLOW}[3/5]${NC} Checking Frontend structure..."
if [ -f "Frontend/package.json" ] && [ -f "Frontend/src/App.jsx" ]; then
    echo -e "${GREEN}✓${NC} Frontend files found"
    
    # Check for required files
    echo -e "  ${YELLOW}Checking components...${NC}"
    if [ -f "Frontend/src/pages/BookingDetail.jsx" ]; then
        echo -e "    ${GREEN}✓${NC} BookingDetail.jsx"
    fi
    if [ -f "Frontend/src/pages/BookingForm.jsx" ]; then
        echo -e "    ${GREEN}✓${NC} BookingForm.jsx"
    fi
    if [ -f "Frontend/src/pages/VendorPendingBookings.jsx" ]; then
        echo -e "    ${GREEN}✓${NC} VendorPendingBookings.jsx (NEW)"
    fi
else
    echo -e "${RED}✗${NC} Frontend files missing!"
fi
echo ""

# 4. Check Documentation
echo -e "${YELLOW}[4/5]${NC} Checking Documentation..."
docs=("VENDOR_APPROVAL_SYSTEM_GUIDE.md" "FRONTEND_SETUP_GUIDE.md" "IMPLEMENTATION_COMPLETE.md")
for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "  ${GREEN}✓${NC} $doc"
    fi
done
echo ""

# 5. Check Environment Files
echo -e "${YELLOW}[5/5]${NC} Checking Environment Configuration..."
if [ -f "Backend/.env" ]; then
    echo -e "  ${GREEN}✓${NC} Backend/.env exists"
else
    echo -e "  ${YELLOW}⚠${NC} Backend/.env not found (create from template)"
fi
if [ -f "Frontend/.env" ]; then
    echo -e "  ${GREEN}✓${NC} Frontend/.env exists"
else
    echo -e "  ${YELLOW}⚠${NC} Frontend/.env not found (create from template)"
fi
echo ""

echo "==================================="
echo "Validation Complete!"
echo "==================================="
echo ""
echo "Next Steps:"
echo "1. Create Backend/.env (use template from FRONTEND_SETUP_GUIDE.md)"
echo "2. Create Frontend/.env (set VITE_API_URL)"
echo "3. Install dependencies:"
echo "   cd Backend && npm install"
echo "   cd Frontend && npm install"
echo "4. Start Backend: cd Backend && npm run dev"
echo "5. Start Frontend: cd Frontend && npm run dev"
echo ""
