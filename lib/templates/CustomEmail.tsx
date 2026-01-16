import { Text, Section } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "./components/EmailLayout";

interface CustomEmailProps {
  name: string;
  subject?: string;
  body?: string;
}

export const CustomEmail: React.FC<CustomEmailProps> = ({
  name = "Hacker",
  subject = "A Message from RevolutionUC",
  body = "This is a custom message from the RevolutionUC team.",
}) => {
  // Split body by newlines to preserve paragraph formatting
  const paragraphs = body.split("\n\n").filter((p) => p.trim());

  return (
    <EmailLayout preview={subject}>
      <Text style={heading}>{subject}</Text>

      <Text style={paragraph}>Hi {name},</Text>

      {paragraphs.map((p, index) => (
        <Text key={index} style={paragraph}>
          {p}
        </Text>
      ))}

      <Section style={signatureSection}>
        <Text style={paragraph}>
          Best,
          <br />
          The RevolutionUC Team
        </Text>
      </Section>
    </EmailLayout>
  );
};

// Styles
const heading = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "600",
  lineHeight: "32px",
  margin: "0 0 24px",
};

const paragraph = {
  color: "#525f7f",
  fontSize: "16px",
  lineHeight: "26px",
  margin: "0 0 16px",
};

const signatureSection = {
  marginTop: "32px",
};

export default CustomEmail;
