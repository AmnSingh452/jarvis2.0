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
  Frame
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);
  
  // Get existing widget settings from database
  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();
  
  try {
    let settings = await prisma.widgetSettings.findUnique({
      where: { shopDomain: session.shop }
    });
    
    // If no settings exist, create default ones
    if (!settings) {
      settings = await prisma.widgetSettings.create({
        data: { shopDomain: session.shop }
      });
    }
    
    return json({ settings, shopDomain: session.shop });
  } catch (error) {
    console.error("Error loading widget settings:", error);
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
    };
    
    await prisma.widgetSettings.upsert({
      where: { shopDomain: session.shop },
      update: settingsData,
      create: { shopDomain: session.shop, ...settingsData }
    });
    
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
  });
  
  const handleFieldChange = (field) => (value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setUnsavedChanges(true);
  };
  
  const handleSave = () => {
    const form = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      form.append(key, value.toString());
    });
    submit(form, { method: "post" });
    setUnsavedChanges(false);
    setShowToast(true);
  };
  
  const positionOptions = [
    { label: "Bottom Right", value: "bottom-right" },
    { label: "Bottom Left", value: "bottom-left" },
    { label: "Top Right", value: "top-right" },
    { label: "Top Left", value: "top-left" },
  ];
  
  const buttonSizeOptions = [
    { label: "Small (50px)", value: "50px" },
    { label: "Medium (60px)", value: "60px" },
    { label: "Large (70px)", value: "70px" },
    { label: "Extra Large (80px)", value: "80px" },
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
            content: "Back to App",
            url: "/app"
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
                  <FormLayout>
                    <TextField
                      label="Primary Color"
                      value={formData.primaryColor}
                      onChange={handleFieldChange("primaryColor")}
                      helpText="Main color for the chat button and user messages"
                    />
                    <TextField
                      label="Secondary Color"
                      value={formData.secondaryColor}
                      onChange={handleFieldChange("secondaryColor")}
                      helpText="Hover color for interactive elements"
                    />
                    <Select
                      label="Button Size"
                      value={formData.buttonSize}
                      onChange={handleFieldChange("buttonSize")}
                      options={buttonSizeOptions}
                    />
                    <Select
                      label="Position"
                      value={formData.position}
                      onChange={handleFieldChange("position")}
                      options={positionOptions}
                    />
                    <TextField
                      label="Button Icon"
                      value={formData.buttonIcon}
                      onChange={handleFieldChange("buttonIcon")}
                      helpText="Emoji or text to display on the chat button"
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
              
              {/* Preview */}
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">👀 Preview</Text>
                  <div style={{ 
                    padding: "20px", 
                    backgroundColor: "#f9f9f9", 
                    borderRadius: "8px",
                    position: "relative",
                    height: "200px"
                  }}>
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
                        fontSize: "18px",
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                      }}
                    >
                      {formData.buttonIcon}
                    </div>
                    <Text variant="bodyMd" color="subdued">
                      Preview of your chat button position and appearance
                    </Text>
                  </div>
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
