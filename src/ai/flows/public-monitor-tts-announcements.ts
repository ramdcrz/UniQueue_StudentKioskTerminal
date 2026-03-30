
'use server';
/**
 * @fileOverview A Genkit flow for generating Text-to-Speech announcements for the public monitor.
 *
 * - announceTicket - A function that generates an audible announcement for a called ticket.
 * - PublicMonitorTTSAnnouncementsInput - The input type for the announceTicket function.
 * - PublicMonitorTTSAnnouncementsOutput - The return type for the announcementTicket function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import wav from 'wav';

const PublicMonitorTTSAnnouncementsInputSchema = z.object({
  ticketNumber: z.string().describe('The ticket number being called (e.g., M-012).'),
  departmentName: z.string().describe('The name of the department the counter belongs to (e.g., Main Building).'),
  serviceType: z.string().describe('The type of service (e.g., Cashier, Accounting).'),
  counterNumber: z.number().describe('The number of the counter the ticket is called to.'),
});
export type PublicMonitorTTSAnnouncementsInput = z.infer<typeof PublicMonitorTTSAnnouncementsInputSchema>;

const PublicMonitorTTSAnnouncementsOutputSchema = z.object({
  media: z.string().describe(
    "The base64 encoded WAV audio data URI for the announcement. Expected format: 'data:audio/wav;base64,<encoded_data>'."
  ),
});
export type PublicMonitorTTSAnnouncementsOutput = z.infer<typeof PublicMonitorTTSAnnouncementsOutputSchema>;

export async function announceTicket(input: PublicMonitorTTSAnnouncementsInput): Promise<PublicMonitorTTSAnnouncementsOutput> {
  return publicMonitorTTSAnnouncementsFlow(input);
}

const publicMonitorTTSAnnouncementsFlow = ai.defineFlow(
  {
    name: 'publicMonitorTTSAnnouncementsFlow',
    inputSchema: PublicMonitorTTSAnnouncementsInputSchema,
    outputSchema: PublicMonitorTTSAnnouncementsOutputSchema,
  },
  async input => {
    const {ticketNumber, counterNumber} = input;
    
    // Using a very direct announcement format with dots for natural separation.
    // The prompt explicitly asks for slow speech while keeping the text short for speed.
    const announcementText = `Number . . . ${ticketNumber} . . . Counter . . . ${counterNumber}.`;

    const {media} = await ai.generate({
      model: googleAI.model('gemini-2.5-flash-preview-tts'),
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {voiceName: 'Algenib'},
          },
        },
      },
      prompt: `Speak this announcement extremely slowly and clearly: ${announcementText}`,
    });

    if (!media) {
      throw new Error('No audio media returned from TTS generation.');
    }

    const audioBuffer = Buffer.from(
      media.url.substring(media.url.indexOf(',') + 1),
      'base64'
    );

    const wavBase64 = await toWav(audioBuffer);

    return {
      media: 'data:audio/wav;base64,' + wavBase64,
    };
  }
);

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    let bufs = [] as any[];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    writer.write(pcmData);
    writer.end();
  });
}
