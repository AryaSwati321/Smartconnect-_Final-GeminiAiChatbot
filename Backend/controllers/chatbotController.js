const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const User = require('../models/User');
const Booking = require('../models/Booking');



function buildGeminiPrompt(message, userContext) {

return `
You are SmartConnect AI.

SmartConnect is an AI Powered Hyperlocal Community Hub.

Modules

• User Authentication
• Service Booking
• Vendor Registration
• Vendor Dashboard
• Booking Tracking
• Community Posts
• Events
• Ratings
• Reviews
• Profile Management

User Information

Name : ${userContext.name}

Role : ${userContext.role}

Completed Bookings : ${userContext.bookingCount}

Recent Bookings

${userContext.recentBookings
.map((b)=>`${b.serviceName} (${b.status})`)
.join("\n")}

Rules

• Give short answers.

• Answer professionally.

• If the question is unrelated to SmartConnect,
answer normally.

Question

${message}

`;
}

async function generateGeminiResponse(message, userContext) {
  try {
    console.log("✅ Gemini API Called");

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: buildGeminiPrompt(message, userContext),
    });

    console.log("✅ Gemini Response:", response.text);

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error.message);
    return null;
  }
}

// Simulated AI responses with context awareness
const generateAIResponse = async (message, userContext) => {
  const q = message.toLowerCase().trim();
  
  // Personalization: Include user name and role
  const userName = userContext?.name || 'there';
  const userRole = userContext?.role || 'user';
  
  // Booking history for context
  const recentBookings = userContext?.recentBookings || [];
  const bookingCount = userContext?.bookingCount || 0;

  // Greeting responses
  if (q.match(/^(hi|hello|hey|greetings|good|morning|afternoon|evening)/i)) {
    const greetings = [
      `👋 Hello ${userName}! Welcome to Smart Connect. I'm your AI assistant. How can I help you today?`,
      `Hey ${userName}! 👋 Great to see you. What can I assist you with?`,
      `Welcome back, ${userName}! 🎉 How can I make your day better?`,
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // Booking related
  if (q.includes('book') || q.includes('service')) {
    if (userRole === 'vendor' || userRole === 'provider') {
      return `📋 **As a Service Provider:**

You can manage your bookings through:
- **Dashboard**: View all incoming booking requests
- **Accepted Bookings**: Accept/reject service requests
- **Completed Tasks**: Track your service history
- **Profile**: Update your availability and services

**Quick Actions:**
1. Set your working hours ⏰
2. Choose service categories 🔧
3. Review and accept bookings ✅
4. Update location 📍
5. Receive payments 💰

Would you like help with any specific area?`;
    }

    return `📱 **How to Book a Service:**

Hi ${userName}! Here's your personalized booking guide:

1️⃣ **Search** - Browse services by category (Plumbing, Electrical, etc.)
2️⃣ **Compare** - View ${Math.floor(Math.random() * 5) + 3}-5 providers with ratings
3️⃣ **Select** - Pick your preferred vendor
4️⃣ **Schedule** - Choose date and time
5️⃣ **Confirm** - Verify details and pay
6️⃣ **Track** - Real-time vendor location tracking 📍
7️⃣ **Review** - Rate and review after service

${bookingCount > 0 ? `📊 You've completed ${bookingCount} bookings! Your trust score helps you get better providers.` : '🆕 First booking? No worries! Our vendors are carefully verified.'}`;
  }

  // Tracking
  if (q.includes('track') || q.includes('where') || q.includes('location')) {
    if (recentBookings.length === 0) {
      return `📍 **Live Tracking:**

You don't have any active bookings right now. Once you book a service and the vendor accepts, you'll be able to:

✅ Track vendor location in real-time 🗺️
✅ See ETA updates every 10 seconds ⏱️
✅ View distance to your location 📏
✅ Get notifications when vendor is arriving 🔔

Ready to book your first service?`;
    }

    return `📍 **Track Your Vendor:**

Great! You have active bookings:

${recentBookings.slice(0, 3).map((b, i) => `${i + 1}. **${b.serviceName}** - Status: ${b.status}`).join('\n')}

**To Track:**
1. Go to "My Bookings"
2. Select an active booking
3. Click "Live Tracking" 🗺️
4. Watch real-time location updates

**What You'll See:**
📍 Vendor's current location
⏱️ ETA to your location
📏 Distance in kilometers
🚗 Route being taken`;
  }

  // Cancellation
  if (q.includes('cancel')) {
    return `❌ **How to Cancel:**

Hi ${userName}! Here's your cancellation options:

**BEFORE Vendor Accepts:**
✅ Cancel anytime in "My Bookings"
✅ Full refund in 24-48 hours
📍 No penalties

**AFTER Vendor Accepts:**
⚠️ Contact vendor first via chat
📞 For urgent help, use Chat Support
💰 Refund depends on vendor's policy

${bookingCount > 0 ? `✨ As a trusted customer with ${bookingCount} bookings, vendors may be flexible with you!` : ''}

**Need immediate help?** Click "Chat Support" below! 👇`;
  }

  // Payment and billing
  if (q.includes('pay') || q.includes('payment') || q.includes('bill') || q.includes('price') || q.includes('cost')) {
    return `💳 **Payment & Pricing:**

**Payment Methods:**
💳 Credit/Debit Cards
📱 Digital Wallets (if available)
💰 Cash on Delivery

**Pricing:**
🔍 Transparent pricing - no hidden charges
📊 Price quotes before booking
🏷️ Discounts for regular customers
💡 Emergency services may cost extra

**Safety:**
🔒 SSL encrypted transactions
🛡️ Money-back guarantee if unsatisfied
📋 Detailed invoices for every booking

**Questions?** Let me know the specifics!`;
  }

  // Vendor/Provider specific
  if (q.includes('vendor') || q.includes('provider') || q.includes('become provider')) {
    return `👷 **About Vendors & Providers:**

**For Service Seekers:**
✨ All vendors are verified
⭐ Read real customer reviews
🏆 Top-rated providers get more bookings
📞 Direct chat with vendors

**For Service Providers:**
💼 Easy registration process
📈 Build your business profile
⭐ Get rated by customers
💰 Secure payment system
📱 Accept/manage bookings easily

**Why Join as a Vendor?**
🎯 Reach 1000s of customers
💪 Grow your business
🔒 Secure payment system
📊 Business analytics
🎓 Training & support

Interested in becoming a provider? Contact admin! 📧`;
  }

  // Support and help
  if (q.includes('help') || q.includes('support') || q.includes('problem') || q.includes('issue')) {
    return `🆘 **How We Can Help:**

Hi ${userName}! I'm here to assist with:

📱 **Account Issues:**
- Login/password problems
- Profile updates
- Account verification

🚀 **Booking Support:**
- How to book
- Tracking issues
- Cancellations

💰 **Payment Issues:**
- Transaction problems
- Refunds
- Billing questions

⭐ **Service Quality:**
- Complaints about service
- Vendor disputes
- Quality concerns

**Chat Support Team:**
📧 ADMIN.SMARTCONNECT@GMAIL.COM
⏰ Response time: 24 hours
🎧 Available for emergencies

What's your issue? I can help or connect you with our support team!`;
  }

  // Ratings and reviews
  if (q.includes('rating') || q.includes('review') || q.includes('feedback')) {
    return `⭐ **Ratings & Reviews:**

**Why Your Review Matters:**
✍️ Help other customers choose
🏆 Reward good vendors
🚨 Alert us to problems
🌟 Build community trust

**How to Review:**
1. Booking completed ✅
2. Go to "My Bookings"
3. Click "Rate & Review"
4. Share your experience ⭐

**What to Include:**
- Service quality (1-5 stars)
- Professionalism & punctuality
- Value for money
- Specific comments

**Tips:**
💡 Be honest but fair
📸 Add photos if relevant
⏰ Review within 7 days
🎯 Specific feedback helps most

Your reviews power the Smart Connect community! 💪`;
  }

  // Account and profile
  if (q.includes('profile') || q.includes('account') || q.includes('settings')) {
    return `👤 **Account & Profile:**

**Your Profile:**
📝 Update personal information
📸 Upload profile picture
📍 Set your service area
🔔 Notification preferences

**Security:**
🔒 Change password
🔑 Two-factor authentication (if available)
📋 Login history
🚪 Active sessions

**Preferences:**
🔔 Notifications: Email, SMS, Push
🌙 Theme: Light/Dark mode
🗣️ Language: English
⚙️ Advanced settings

**For Vendors:**
📊 Business profile
💼 Service categories
📋 Certifications
🌟 Availability hours

Need help updating your ${userRole} profile?`;
  }

  // Promotions and offers
  if (q.includes('promo') || q.includes('discount') || q.includes('offer') || q.includes('deal')) {
    return `🎉 **Promotions & Offers:**

**Current Offers for ${userName}:**
🎁 ${bookingCount > 0 ? 'Loyalty discount: 10% on next booking' : 'Welcome offer: 15% off first booking'}
📍 Location-based specials
⏰ Weekend deals
🎯 Referral bonuses

**How to Use:**
1. Browse available offers
2. Click "Apply Offer"
3. Offer applies to cart
4. Complete booking

**Referral Program:**
👥 Invite friends
🎁 Both get rewards
💰 Earn credits
🌟 VIP benefits after 5+ referrals

Check "Promotions" section for latest deals! 🏷️`;
  }

  // Safety and security
  if (q.includes('safe') || q.includes('secure') || q.includes('trust') || q.includes('verify')) {
    return `🔒 **Safety & Trust:**

**Why Smart Connect is Safe:**
✅ All vendors verified & background checked
⭐ Real customer reviews & ratings
📋 ID verification required
🛡️ SSL encrypted data
🔐 Secure payment system

**Your Protection:**
💳 Payment protection
📋 Booking guarantee
🚨 Emergency support 24/7
📞 Direct vendor communication
📸 Service photo documentation

**Tips for Safer Bookings:**
1. Check vendor ratings (4+ stars 🌟)
2. Read recent reviews
3. Communicate clearly
4. Share location with trusted person
5. Take photos/videos

**Report Issues:**
🚨 Unethical behavior? Report immediately!
📧 Contact: ADMIN.SMARTCONNECT@GMAIL.COM

Your safety is our priority! 💪`;
  }

  // Default helpful response
  return `🤖 **I'm Your Smart Connect AI Assistant!**

I can help you with:
📱 **Booking** - How to find and book services
📍 **Tracking** - Live location updates
❌ **Cancellations** - How to cancel bookings
💳 **Payments** - Pricing & payment methods
⭐ **Reviews** - Rating vendors
👤 **Account** - Profile & settings
🆘 **Support** - Getting help
🎉 **Offers** - Promotions & discounts
🔒 **Safety** - Trust & security

**You can ask me:**
- "How do I book a plumber?"
- "How do I track my vendor?"
- "What's your cancellation policy?"
- "How do I get discounts?"

Hi ${userName}! What would you like to know? 😊`;
};

exports.chatMessage = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (message.length > 2000) {
      return res.status(400).json({ msg: 'Message is required' });
    }
    

    // Get user context
    const user = await User.findById(userId).select('name email role phone').lean();
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Get recent bookings count
    const bookingCount = await Booking.countDocuments({
      user: userId,
      status: { $in: ['completed', 'cancelled'] }
    });

    // Get active bookings for context
    const recentBookings = await Booking.find({
      user: userId,
      status: { $in: ['pending', 'requested', 'accepted', 'on_the_way', 'in_progress', 'completion_requested'] }
    })
      .populate('category', '_id name')
      .select('service serviceType category status')
      .limit(3)
      .lean();

    const userContext = {
      name: user.name || 'Guest',
      email: user.email,
      role: user.role,
      phone: user.phone,
      bookingCount,
      recentBookings: recentBookings.map(b => ({
        serviceName: b.serviceType || b.service || b.category?.name || 'Service',
        status: b.status
      }))
    };

    // Generate AI response with Gemini, falling back to local responses if no key or API failure.
    let response;
    let source = 'gemini';
    try {
      response = await generateGeminiResponse(message.trim(), userContext);
    } catch (geminiErr) {
      console.error('Gemini chatbot fallback:', geminiErr.message);
    }

    if (!response) {
      source = 'local';
      response = await generateAIResponse(message, userContext);
    }

    return res.json({
      reply: response,
      source,
      userContext: {
        name: user.name,
        role: user.role,
        bookingCount
      }
    });
  } catch (err) {
    console.error('CHATBOT ERROR:', err);
    return res.status(500).json({ msg: 'Error processing chat message' });
  }
};

exports.getChatHistory = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    
    // Get user basic info
    const user = await User.findById(userId).select('name role').lean();
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const greeting = `👋 Welcome back, ${user.name || 'Guest'}! I'm your Smart Connect AI Assistant. How can I help you today?`;

    return res.json({
      initialMessage: greeting,
      userRole: user.role,
      userName: user.name
    });
  } catch (err) {
    console.error('ERROR:', err);
    return res.status(500).json({ msg: 'Error fetching chat history' });
  }
};
