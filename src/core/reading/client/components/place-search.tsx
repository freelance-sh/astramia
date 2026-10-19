"use client";

import { MapPin } from "lucide-react";
import { useRef, useState } from "react";
import { z } from "zod";
import { placeSchema } from "@/core/reading/domain/schemas";
import type { Place } from "@/core/reading/domain/types";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Spinner } from "@/frontend/components/ui/spinner";
import { useDebouncedCallback } from "@/frontend/hooks/use-debounced-callback";
import { apiClient } from "@/frontend/lib/eden";

const placesSchema = z.object({ response: z.array(placeSchema) });

/**
 * Their birthplace, picked from a list: a typed name alone can't be placed
 * on the globe, and the Ascendant needs where and in which zone they were
 * born.
 */
export function PlaceSearch({
    id,
    place,
    onPlace,
}: {
    id: string;
    place: Place | null;
    onPlace: (place: Place | null) => void;
}) {
    const [text, setText] = useState("");
    const [found, setFound] = useState<Place[] | null>(null);
    const [searching, setSearching] = useState(false);
    // Only the latest search's answer counts.
    const latest = useRef("");

    const search = useDebouncedCallback(async (name: string) => {
        latest.current = name;
        if (name.length < 2) {
            setFound(null);
            setSearching(false);
            return;
        }
        setSearching(true);
        const { data } = await apiClient.api.v1.readings.places.get({
            query: { q: name },
        });
        if (latest.current !== name) return;
        const parsed = placesSchema.safeParse(data);
        setFound(parsed.success ? parsed.data.response : []);
        setSearching(false);
    }, 300);

    if (place)
        return (
            <div className="flex items-center justify-between gap-3 rounded-md border border-astral-gold/60 bg-card/40 px-3 py-2">
                <span className="flex items-center gap-2 text-sm">
                    <MapPin className="size-4 text-astral-gold" />
                    {place.label}
                </span>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        onPlace(null);
                        setFound(null);
                        setText("");
                    }}
                >
                    Cambiar
                </Button>
            </div>
        );

    return (
        <div className="flex flex-col gap-2">
            <div className="relative">
                <Input
                    id={id}
                    autoComplete="off"
                    maxLength={80}
                    placeholder="Escribe tu ciudad: Arequipa, Bogotá…"
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value);
                        search(e.target.value.trim());
                    }}
                />
                {searching && (
                    <Spinner className="absolute top-2.5 right-3 size-4" />
                )}
            </div>
            {found && (
                <ul className="flex flex-col gap-1">
                    {found.map((p) => (
                        <li key={`${p.latitude},${p.longitude}`}>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-auto w-full justify-start whitespace-normal border-astral-ink bg-card/40 px-3 py-2 text-left text-sm"
                                onClick={() => onPlace(p)}
                            >
                                {p.label}
                            </Button>
                        </li>
                    ))}
                    {found.length === 0 && !searching && (
                        <li className="text-muted-foreground text-sm">
                            No la encontramos. Prueba con la ciudad más cercana.
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
}
