import { Metadata } from 'next';
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const { id } = await params;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: deck } = await supabase
    .from('decks')
    .select('name, commander, image_url')
    .eq('id', id)
    .single();

  if (!deck) {
    return {
      title: 'Deck Not Found | Commander Party',
    };
  }

  return {
    title: `${deck.name} | Commander Party`,
    description: `Explora el mazo de ${deck.commander} en la liga Commander Party.`,
    openGraph: {
      title: deck.name,
      description: `Evolucionando a ${deck.commander}`,
      images: [deck.image_url || ''],
    },
    twitter: {
      card: 'summary_large_image',
      title: deck.name,
      description: `Evolucionando a ${deck.commander}`,
      images: [deck.image_url || ''],
    },
  };
}

export default function DeckLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
