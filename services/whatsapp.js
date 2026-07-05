// services/whatsapp.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');

class WhatsAppService {
    constructor() {
        this.client = null;
        this.qrCode = null;
        this.isReady = false;
        this.isConnecting = false;
        this.connectionStatus = 'disconnected'; // disconnected, connecting, connected, authenticated
        this.initializeClient();
    }

    initializeClient() {
        try {
            // Create client with local authentication to save session
            this.client = new Client({
                authStrategy: new LocalAuth({
                    dataPath: path.join(__dirname, '../.wwebjs_auth')
                }),
                puppeteer: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--single-process',
                        '--disable-gpu'
                    ]
                }
            });

            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing WhatsApp client:', error);
            this.connectionStatus = 'error';
        }
    }

    setupEventListeners() {
        // QR Code received
        this.client.on('qr', async (qr) => {
            console.log('QR Code received');
            this.connectionStatus = 'connecting';
            this.isConnecting = true;
            
            try {
                // Generate QR code as data URL
                this.qrCode = await qrcode.toDataURL(qr);
                console.log('QR Code generated successfully');
            } catch (error) {
                console.error('Error generating QR code:', error);
            }
        });

        // Client is ready
        this.client.on('ready', () => {
            console.log('WhatsApp client is ready!');
            this.isReady = true;
            this.isConnecting = false;
            this.connectionStatus = 'connected';
            this.qrCode = null; // Clear QR code when connected
        });

        // Authentication successful
        this.client.on('authenticated', () => {
            console.log('WhatsApp client authenticated');
            this.connectionStatus = 'authenticated';
        });

        // Authentication failed
        this.client.on('auth_failure', (msg) => {
            console.error('Authentication failed:', msg);
            this.connectionStatus = 'auth_failed';
            this.isReady = false;
            this.isConnecting = false;
        });

        // Client disconnected
        this.client.on('disconnected', (reason) => {
            console.log('WhatsApp client disconnected:', reason);
            this.isReady = false;
            this.isConnecting = false;
            this.connectionStatus = 'disconnected';
            this.qrCode = null;
        });

        // Handle incoming messages (optional - for future features)
        this.client.on('message_create', (message) => {
            // You can add message handling logic here if needed
            console.log('Message received:', message.body);
        });
    }

    // Initialize the client
    async initialize() {
        if (!this.client) {
            this.initializeClient();
        }
        
        if (!this.isConnecting && !this.isReady) {
            try {
                console.log('Initializing WhatsApp client...');
                await this.client.initialize();
                return { success: true, message: 'WhatsApp client initialization started' };
            } catch (error) {
                console.error('Error initializing client:', error);
                this.connectionStatus = 'error';
                return { success: false, message: 'Failed to initialize WhatsApp client', error: error.message };
            }
        }
        
        return { success: true, message: 'Client already initializing or ready' };
    }

    // Get current status
    getStatus() {
        return {
            isReady: this.isReady,
            isConnecting: this.isConnecting,
            connectionStatus: this.connectionStatus,
            qrCode: this.qrCode
        };
    }

    // Get QR code for scanning
    getQRCode() {
        return this.qrCode;
    }

    // Format phone number for WhatsApp (Pakistani format)
    formatPhoneNumber(phoneNumber) {
        if (!phoneNumber) return null;
        
        // Remove any non-digit characters
        let cleaned = phoneNumber.replace(/\D/g, '');
        
        // Handle Pakistani phone numbers
        if (cleaned.startsWith('0')) {
            // Remove leading 0 and add country code
            cleaned = '92' + cleaned.substring(1);
        } else if (cleaned.startsWith('92')) {
            // Already has country code
        } else {
            // Assume it's a local number, add country code
            cleaned = '92' + cleaned;
        }
        
        return cleaned + '@c.us';
    }

    // Send message to a single number
    async sendMessage(phoneNumber, message) {
        if (!this.isReady) {
            return { 
                success: false, 
                message: 'WhatsApp client is not ready. Please connect first.' 
            };
        }

        try {
            const formattedNumber = this.formatPhoneNumber(phoneNumber);
            if (!formattedNumber) {
                return { 
                    success: false, 
                    message: 'Invalid phone number format' 
                };
            }

            // Check if number exists on WhatsApp
            const numberId = await this.client.getNumberId(formattedNumber);
            if (!numberId) {
                return { 
                    success: false, 
                    message: 'Phone number is not registered on WhatsApp' 
                };
            }

            // Send message
            await this.client.sendMessage(numberId._serialized, message);
            
            return { 
                success: true, 
                message: 'Message sent successfully',
                phoneNumber: phoneNumber 
            };
        } catch (error) {
            console.error('Error sending message:', error);
            return { 
                success: false, 
                message: 'Failed to send message: ' + error.message,
                phoneNumber: phoneNumber 
            };
        }
    }

    // Send message to multiple numbers
    async sendBulkMessages(phoneNumbers, message) {
        if (!this.isReady) {
            return { 
                success: false, 
                message: 'WhatsApp client is not ready. Please connect first.' 
            };
        }

        const results = [];
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        for (let i = 0; i < phoneNumbers.length; i++) {
            const phoneNumber = phoneNumbers[i];
            console.log(`Sending message to ${phoneNumber} (${i + 1}/${phoneNumbers.length})`);
            
            const result = await this.sendMessage(phoneNumber, message);
            results.push({
                phoneNumber: phoneNumber,
                success: result.success,
                message: result.message
            });

            // Add delay between messages to avoid rate limiting
            if (i < phoneNumbers.length - 1) {
                await delay(2000); // 2 second delay between messages
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;

        return {
            success: true,
            message: `Bulk message completed. ${successCount} sent successfully, ${failCount} failed.`,
            results: results,
            summary: {
                total: results.length,
                successful: successCount,
                failed: failCount
            }
        };
    }

    // Disconnect client
    async disconnect() {
        if (this.client) {
            try {
                await this.client.destroy();
                this.isReady = false;
                this.isConnecting = false;
                this.connectionStatus = 'disconnected';
                this.qrCode = null;
                console.log('WhatsApp client disconnected');
                return { success: true, message: 'WhatsApp client disconnected' };
            } catch (error) {
                console.error('Error disconnecting client:', error);
                return { success: false, message: 'Error disconnecting client', error: error.message };
            }
        }
        return { success: true, message: 'Client was not connected' };
    }

    // Restart client
    async restart() {
        console.log('Restarting WhatsApp client...');
        await this.disconnect();
        await delay(2000); // Wait 2 seconds
        this.initializeClient();
        return await this.initialize();
    }
}

// Helper function for delays
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Create a singleton instance
const whatsappService = new WhatsAppService();

module.exports = whatsappService;