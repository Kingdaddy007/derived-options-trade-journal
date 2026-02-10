-- Add example_images column to strategies table
ALTER TABLE strategies ADD COLUMN IF NOT EXISTS example_images text[] DEFAULT '{}';

-- Create storage bucket for strategy example images
INSERT INTO storage.buckets (id, name, public) VALUES ('strategy-examples', 'strategy-examples', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anonymous uploads to the bucket
CREATE POLICY "Allow anonymous uploads" ON storage.objects
FOR INSERT TO anon WITH CHECK (bucket_id = 'strategy-examples');

-- Allow anonymous reads from the bucket
CREATE POLICY "Allow anonymous reads" ON storage.objects
FOR SELECT TO anon USING (bucket_id = 'strategy-examples');

-- Allow anonymous deletes from the bucket
CREATE POLICY "Allow anonymous deletes" ON storage.objects
FOR DELETE TO anon USING (bucket_id = 'strategy-examples');
