import { useState } from "react";
import { useLoaderData, useSubmit, useActionData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  FormLayout,
  TextField,
  Select,
  Checkbox,
  Banner,
  BlockStack,
  InlineStack,
  Toast,
  Frame,
  Divider
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";

// Simple color utility functions
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  
  // Get existing widget settings from database
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  
  try {
    console.log("🔍 Loading widget settings for shop:", session.shop);
    
    // Test database connection
    await prisma.$connect();
    console.log("✅ Database connection successful");
    
    let settings = await prisma.widgetSettings.findUnique({
      where: { shopDomain: session.shop }
    });
    
    // If no settings exist, create default ones
    if (!settings) {
      console.log("📝 Creating default widget settings for shop:", session.shop);
      try {
        settings = await prisma.widgetSettings.create({
          data: { 
            shopDomain: session.shop,
            isEnabled: true,
            primaryColor: "#007bff",
            secondaryColor: "#0056b3",
            buttonSize: "60px",
            position: "bottom-right",
            buttonIcon: "💬",
            windowWidth: "320px",
            windowHeight: "420px",
            headerText: "Jarvis AI Chatbot",
            placeholderText: "Type your message...",
            welcomeMessage: "Hello! How can I assist you today?",
            showTypingIndicator: true,
            enableSounds: false,
            autoOpen: false,
            cartAbandonmentEnabled: false,
            cartAbandonmentDiscount: 10,
            cartAbandonmentDelay: 300,
            cartAbandonmentMessage: "Don't miss out! Complete your purchase and get {discount}% off!"
          }
        });
        console.log("✅ Default settings created successfully");
      } catch (createError) {
        console.error("❌ Failed to create default settings:", createError);
        throw createError;
      }
    }
    
    console.log("✅ Widget settings loaded successfully for", session.shop);
    
    return json({ settings, shopDomain: session.shop });
  } catch (error) {
    console.error("❌ Error loading widget settings:", error);
    return json({ 
      settings: null, 
      shopDomain: session.shop,
      error: "Failed to load settings" 
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function action({ request }) {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  
  // Debug: Log all form data
  console.log("🔍 Form Data Received:");
  for (const [key, value] of formData.entries()) {
    console.log(`  ${key}: ${value}`);
  }
  
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  
  try {
    const settingsData = {
      primaryColor: formData.get("primaryColor") || "#007bff",
      secondaryColor: formData.get("secondaryColor") || "#0056b3",
      buttonSize: formData.get("buttonSize") || "60px",
      position: formData.get("position") || "bottom-right",
      buttonIcon: formData.get("buttonIcon") || "💬",
      windowWidth: formData.get("windowWidth") || "320px",
      windowHeight: formData.get("windowHeight") || "420px",
      headerText: formData.get("headerText") || "Jarvis AI Chatbot",
      placeholderText: formData.get("placeholderText") || "Type your message...",
      welcomeMessage: formData.get("welcomeMessage") || "Hello! How can I assist you today?",
      showTypingIndicator: formData.get("showTypingIndicator") === "on",
      enableSounds: formData.get("enableSounds") === "on",
      autoOpen: formData.get("autoOpen") === "on",
      customCSS: formData.get("customCSS") || "",
      isEnabled: formData.get("isEnabled") === "on",
      // Cart Abandonment Settings
      cartAbandonmentEnabled: formData.get("cartAbandonmentEnabled") === "on",
      cartAbandonmentDiscount: parseInt(formData.get("cartAbandonmentDiscount")) || 10,
      cartAbandonmentMessage: formData.get("cartAbandonmentMessage") || "Don't miss out! Use code {discount_code} for {discount_percentage}% off your order!",
      cartAbandonmentDelay: parseInt(formData.get("cartAbandonmentDelay")) || 300,
    };
    
    console.log("💾 Settings Data to Save:", settingsData);
    
    const result = await prisma.widgetSettings.upsert({
      where: { shopDomain: session.shop },
      update: settingsData,
      create: { shopDomain: session.shop, ...settingsData }
    });
    
    console.log("✅ Settings Saved Successfully:", result);
    
    return json({ success: true, message: "Settings saved successfully!" });
  } catch (error) {
    console.error("Error saving widget settings:", error);
    return json({ success: false, error: "Failed to save settings" }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export default function WidgetSettings() {
  const { settings, error } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showToast, setShowToast] = useState(false);
  
  // Form state with safe defaults
  const [formData, setFormData] = useState({
    primaryColor: settings?.primaryColor || "#007bff",
    secondaryColor: settings?.secondaryColor || "#0056b3",
    buttonSize: settings?.buttonSize || "60px",
    position: settings?.position || "bottom-right",
    buttonIcon: settings?.buttonIcon || "💬",
    windowWidth: settings?.windowWidth || "320px",
    windowHeight: settings?.windowHeight || "420px",
    headerText: settings?.headerText || "Jarvis AI Chatbot",
    placeholderText: settings?.placeholderText || "Type your message...",
    welcomeMessage: settings?.welcomeMessage || "Hello! How can I assist you today?",
    showTypingIndicator: settings?.showTypingIndicator ?? true,
    enableSounds: settings?.enableSounds ?? false,
    autoOpen: settings?.autoOpen ?? false,
    customCSS: settings?.customCSS || "",
    isEnabled: settings?.isEnabled ?? true,
    // Cart Abandonment Settings
    cartAbandonmentEnabled: settings?.cartAbandonmentEnabled ?? false,
    cartAbandonmentDiscount: settings?.cartAbandonmentDiscount || 10,
    cartAbandonmentMessage: settings?.cartAbandonmentMessage || "Don't miss out! Use code {discount_code} for {discount_percentage}% off your order!",
    cartAbandonmentDelay: settings?.cartAbandonmentDelay || 300,
  });
  
  // Color picker states (simplified)
  const [showPrimaryPicker, setShowPrimaryPicker] = useState(false);
  const [showSecondaryPicker, setShowSecondaryPicker] = useState(false);
  
  const handleFieldChange = (field) => (value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setUnsavedChanges(true);
  };
  
  const handleSave = () => {
    const form = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      // Handle boolean values properly for form submission
      if (typeof value === 'boolean') {
        if (value) {
          form.append(key, 'on'); // HTML form checkbox value when checked
        }
        // Don't append anything if false (checkbox unchecked)
      } else {
        form.append(key, value.toString());
      }
    });
    submit(form, { method: "post" });
    setUnsavedChanges(false);
    setShowToast(true);
  };
  
  // Enhanced options with user-friendly descriptions
  const positionOptions = [
    { label: "Bottom Right (Most Popular)", value: "bottom-right" },
    { label: "Bottom Left", value: "bottom-left" },
    { label: "Top Right", value: "top-right" },
    { label: "Top Left", value: "top-left" },
  ];
  
  const buttonSizeOptions = [
    { label: "Small (50px) - Subtle", value: "50px" },
    { label: "Medium (60px) - Recommended", value: "60px" },
    { label: "Large (70px) - Prominent", value: "70px" },
    { label: "Extra Large (80px) - Bold", value: "80px" },
  ];
  
  const buttonIconOptions = [
    { label: "💬 Speech Bubble (Popular)", value: "💬" },
    { label: "🤖 Robot Face", value: "🤖" },
    { label: "💭 Thought Bubble", value: "💭" },
    { label: "📞 Phone", value: "📞" },
    { label: "✉️ Envelope", value: "✉️" },
    { label: "❓ Question Mark", value: "❓" },
    { label: "🆘 Help", value: "🆘" },
    { label: "💡 Light Bulb", value: "💡" }
  ];
  
  // Color presets for easy selection
  const colorPresets = [
    { name: "Shopify Green", primary: "#00A850", secondary: "#007A3D" },
    { name: "Ocean Blue", primary: "#007bff", secondary: "#0056b3" },
    { name: "Royal Purple", primary: "#6f42c1", secondary: "#5a2d91" },
    { name: "Sunset Orange", primary: "#fd7e14", secondary: "#dc6500" },
    { name: "Forest Green", primary: "#28a745", secondary: "#1e7e34" },
    { name: "Ruby Red", primary: "#dc3545", secondary: "#c82333" },
    { name: "Golden Yellow", primary: "#ffc107", secondary: "#e0a800" },
    { name: "Midnight Black", primary: "#343a40", secondary: "#23272b" }
  ];
  
  // Show success toast when data is saved
  const toastMarkup = showToast && actionData?.success ? (
    <Toast
      content="Settings saved successfully!"
      onDismiss={() => setShowToast(false)}
    />
  ) : null;
  
  if (error && !settings) {
    return (
      <Page title="Widget Settings">
        <Banner status="critical">
          <p>Error loading settings: {error}</p>
        </Banner>
      </Page>
    );
  }
  
  return (
    <Frame>
      <Page
        title="Chatbot Widget Customization"
        subtitle="Customize the appearance and behavior of your chatbot widget"
        primaryAction={{
          content: "Save Changes",
          onAction: handleSave,
          disabled: !unsavedChanges
        }}
        secondaryActions={[
          {
            content: "Dashboard",
            url: "/app"
          },
          {
            content: "Billing & Plans",
            url: "/app/billing_v2"
          },
          {
            content: "Additional Features",
            url: "/app/additional"
          }
        ]}
      >
        <Layout>
          <Layout.Section>
            {unsavedChanges && (
              <Banner status="info">
                <p>You have unsaved changes. Click "Save Changes" to apply them.</p>
              </Banner>
            )}
            {actionData?.error && (
              <Banner status="critical">
                <p>Error: {actionData.error}</p>
              </Banner>
            )}
          </Layout.Section>
          
          <Layout.Section oneHalf>
            <BlockStack gap="500">
              {/* Appearance Settings */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">🎨 Appearance</Text>
                  
                  {/* Color Presets */}
                  <div>
                    <Text variant="headingSm" as="h3">Quick Color Themes</Text>
                    <Text variant="bodySm" color="subdued">Choose a preset or customize your own</Text>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                      gap: '8px', 
                      marginTop: '12px' 
                    }}>
                      {colorPresets.map((preset, index) => (
                        <button
                          key={index}
                          style={{
                            border: '2px solid #e1e5e9',
                            borderRadius: '8px',
                            padding: '8px',
                            cursor: 'pointer',
                            backgroundColor: 'white',
                            textAlign: 'center'
                          }}
                          onClick={() => {
                            handleFieldChange("primaryColor")(preset.primary);
                            handleFieldChange("secondaryColor")(preset.secondary);
                          }}
                        >
                          <div style={{ 
                            display: 'flex', 
                            height: '20px', 
                            borderRadius: '4px', 
                            overflow: 'hidden',
                            marginBottom: '4px'
                          }}>
                            <div style={{ flex: 1, backgroundColor: preset.primary }}></div>
                            <div style={{ flex: 1, backgroundColor: preset.secondary }}></div>
                          </div>
                          <Text variant="captionMd">{preset.name}</Text>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <Divider />
                  
                  <FormLayout>
                    {/* Custom Color Pickers */}
                    <div>
                      <Text variant="headingSm" as="h3">Primary Color</Text>
                      <Text variant="bodySm" color="subdued">Main color for chat button and user messages</Text>
                      <div style={{ marginTop: '8px' }}>
                        <button
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            border: '2px solid #e1e5e9',
                            borderRadius: '8px',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            width: '100%'
                          }}
                          onClick={() => setShowPrimaryPicker(!showPrimaryPicker)}
                        >
                          <div style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: formData.primaryColor,
                            borderRadius: '4px',
                            border: '1px solid #ccc'
                          }}></div>
                          <Text>{formData.primaryColor}</Text>
                        </button>
                        {showPrimaryPicker && (
                          <div style={{ marginTop: '8px' }}>
                            <input
                              type="color"
                              value={formData.primaryColor}
                              onChange={(e) => handleFieldChange("primaryColor")(e.target.value)}
                              style={{
                                width: '100%',
                                height: '40px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <Text variant="headingSm" as="h3">Secondary Color</Text>
                      <Text variant="bodySm" color="subdued">Hover and accent color</Text>
                      <div style={{ marginTop: '8px' }}>
                        <button
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '12px',
                            border: '2px solid #e1e5e9',
                            borderRadius: '8px',
                            backgroundColor: 'white',
                            cursor: 'pointer',
                            width: '100%'
                          }}
                          onClick={() => setShowSecondaryPicker(!showSecondaryPicker)}
                        >
                          <div style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: formData.secondaryColor,
                            borderRadius: '4px',
                            border: '1px solid #ccc'
                          }}></div>
                          <Text>{formData.secondaryColor}</Text>
                        </button>
                        {showSecondaryPicker && (
                          <div style={{ marginTop: '8px' }}>
                            <input
                              type="color"
                              value={formData.secondaryColor}
                              onChange={(e) => handleFieldChange("secondaryColor")(e.target.value)}
                              style={{
                                width: '100%',
                                height: '40px',
                                border: '1px solid #ccc',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Select
                      label="Button Size"
                      value={formData.buttonSize}
                      onChange={handleFieldChange("buttonSize")}
                      options={buttonSizeOptions}
                      helpText="Larger buttons are more noticeable but take more space"
                    />
                    <Select
                      label="Position"
                      value={formData.position}
                      onChange={handleFieldChange("position")}
                      options={positionOptions}
                      helpText="Bottom right is most common and expected by users"
                    />
                    <Select
                      label="Button Icon"
                      value={formData.buttonIcon}
                      onChange={handleFieldChange("buttonIcon")}
                      options={buttonIconOptions}
                      helpText="Choose an icon that represents chat or help"
                    />
                  </FormLayout>
                </BlockStack>
              </Card>
              
              {/* Chat Window Settings */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">💬 Chat Window</Text>
                  <FormLayout>
                    <TextField
                      label="Window Width"
                      value={formData.windowWidth}
                      onChange={handleFieldChange("windowWidth")}
                      helpText="e.g., 320px, 400px"
                    />
                    <TextField
                      label="Window Height"
                      value={formData.windowHeight}
                      onChange={handleFieldChange("windowHeight")}
                      helpText="e.g., 420px, 500px"
                    />
                    <TextField
                      label="Header Text"
                      value={formData.headerText}
                      onChange={handleFieldChange("headerText")}
                    />
                    <TextField
                      label="Input Placeholder"
                      value={formData.placeholderText}
                      onChange={handleFieldChange("placeholderText")}
                    />
                    <TextField
                      label="Welcome Message"
                      value={formData.welcomeMessage}
                      onChange={handleFieldChange("welcomeMessage")}
                      multiline={3}
                      helpText="First message customers see when opening the chat"
                    />
                  </FormLayout>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
          
          <Layout.Section oneHalf>
            <BlockStack gap="500">
              {/* Behavior Settings */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">⚙️ Behavior</Text>
                  <FormLayout>
                    <Checkbox
                      label="Enable Widget"
                      checked={formData.isEnabled}
                      onChange={handleFieldChange("isEnabled")}
                      helpText="Turn the chatbot widget on or off"
                    />
                    <Checkbox
                      label="Show Typing Indicator"
                      checked={formData.showTypingIndicator}
                      onChange={handleFieldChange("showTypingIndicator")}
                    />
                    <Checkbox
                      label="Enable Sounds"
                      checked={formData.enableSounds}
                      onChange={handleFieldChange("enableSounds")}
                    />
                    <Checkbox
                      label="Auto Open on Page Load"
                      checked={formData.autoOpen}
                      onChange={handleFieldChange("autoOpen")}
                      helpText="Automatically open chat window when customers visit your store"
                    />
                  </FormLayout>
                </BlockStack>
              </Card>
              
              {/* Cart Abandonment Recovery */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">🛒 Cart Abandonment Recovery</Text>
                  <Text variant="bodyMd" color="subdued">
                    Automatically offer discount codes to customers who abandon their carts to encourage completion.
                  </Text>
                  
                  <Checkbox
                    label="Enable Cart Abandonment Recovery"
                    checked={formData.cartAbandonmentEnabled}
                    onChange={handleFieldChange("cartAbandonmentEnabled")}
                    helpText="When enabled, the chatbot will offer discount codes to customers who abandon their carts"
                  />
                  
                  {formData.cartAbandonmentEnabled && (
                    <BlockStack gap="400">
                      <TextField
                        type="number"
                        label="Discount Percentage"
                        value={formData.cartAbandonmentDiscount?.toString()}
                        onChange={handleFieldChange("cartAbandonmentDiscount")}
                        suffix="%"
                        min="5"
                        max="50"
                        helpText="Percentage discount to offer (5% - 50%)"
                      />
                      
                      <TextField
                        type="number"
                        label="Trigger Delay (seconds)"
                        value={formData.cartAbandonmentDelay?.toString()}
                        onChange={handleFieldChange("cartAbandonmentDelay")}
                        suffix="seconds"
                        min="60"
                        max="1800"
                        helpText="How long to wait before offering the discount (1 minute - 30 minutes)"
                      />
                      
                      <TextField
                        label="Abandonment Message"
                        value={formData.cartAbandonmentMessage}
                        onChange={handleFieldChange("cartAbandonmentMessage")}
                        multiline={3}
                        helpText="Message to show when offering the discount. Use {discount_percentage} for discount percentage and {discount_code} for the discount code."
                        placeholder="Don't miss out! Use code {discount_code} for {discount_percentage}% off your order!"
                      />
                      
                      <Banner status="info">
                        <Text variant="bodyMd">
                          <strong>How it works:</strong>
                          <br />• Customer adds items to cart and starts chatting
                          <br />• After the delay period, if they haven't completed purchase, chatbot offers discount
                          <br />• Each customer can receive one discount code per hour
                          <br />• Discount codes are valid for single use and expire after 24 hours
                        </Text>
                      </Banner>
                      
                      <Banner status="warning">
                        <Text variant="bodyMd">
                          <strong>Testing:</strong> To test this feature, add items to your cart, start a chat conversation, then wait for the configured delay time. The chatbot will automatically offer a discount code.
                        </Text>
                      </Banner>
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>

              {/* Advanced Settings */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">🔧 Advanced</Text>
                  <TextField
                    label="Custom CSS"
                    value={formData.customCSS}
                    onChange={handleFieldChange("customCSS")}
                    multiline={8}
                    helpText="Add custom CSS to further customize the widget appearance"
                    placeholder=".chat-button { border: 2px solid #000; }"
                  />
                </BlockStack>
              </Card>
              
              {/* Enhanced Preview */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">👀 Live Preview</Text>
                  <div style={{ 
                    padding: "40px", 
                    backgroundColor: "#f9f9f9", 
                    borderRadius: "8px",
                    position: "relative",
                    height: "300px",
                    border: "2px dashed #ccc"
                  }}>
                    <Text variant="bodyMd" color="subdued" as="p" style={{ textAlign: 'center', marginBottom: '20px' }}>
                      Preview of your store with the chatbot
                    </Text>
                    
                    {/* Mock website content */}
                    <div style={{ 
                      backgroundColor: 'white', 
                      padding: '20px', 
                      borderRadius: '4px',
                      marginBottom: '20px',
                      opacity: 0.7
                    }}>
                      <div style={{ height: '12px', backgroundColor: '#e1e5e9', borderRadius: '2px', marginBottom: '8px' }}></div>
                      <div style={{ height: '8px', backgroundColor: '#e1e5e9', borderRadius: '2px', width: '70%' }}></div>
                    </div>
                    
                    {/* Chat button preview with hover effect */}
                    <div
                      style={{
                        position: "absolute",
                        [formData.position.includes("bottom") ? "bottom" : "top"]: "20px",
                        [formData.position.includes("right") ? "right" : "left"]: "20px",
                        backgroundColor: formData.primaryColor,
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: formData.buttonSize,
                        height: formData.buttonSize,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        fontSize: "20px",
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                        transition: "all 0.3s ease"
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = formData.secondaryColor}
                      onMouseLeave={(e) => e.target.style.backgroundColor = formData.primaryColor}
                    >
                      {formData.buttonIcon}
                    </div>
                  </div>
                  
                  <Text variant="bodySm" color="subdued">
                    This is how your chatbot button will appear on your store. Hover over it to see the secondary color effect.
                  </Text>
                </BlockStack>
              </Card>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </Page>
      {toastMarkup}
    </Frame>
  );
}
