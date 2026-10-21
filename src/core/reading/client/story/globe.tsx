"use client";

import { useReducedMotion } from "motion/react";
import {
    type CSSProperties,
    type ReactNode,
    useEffect,
    useRef,
    useState,
} from "react";

export type GlobeBody = "Sol" | "Luna" | "Venus" | "Marte";

/**
 * NASA maps (public domain): the Moon from LRO (SVS 4720), Mars from the
 * Viking mosaic (NASA 3D Resources). The Sun and Venus's clouds are drawn.
 */
const TEXTURES: Partial<Record<GlobeBody, string>> = {
    Luna: "/planets/moon.jpg",
    Marte: "/planets/mars.jpg",
};

interface Look {
    /** 0 lit map, 1 the Sun, 2 Venus's clouds. */
    mode: number;
    /** Sphere radius in the canvas: the rest is corona or atmosphere. */
    radius: number;
    /** Axis tilt toward the viewer, radians. */
    tilt: number;
    /** Seconds per turn; 0 doesn't turn. */
    turn: number;
    glow: [number, number, number];
    glowStrength: number;
    /** Light on the night side. */
    ambient: number;
    /** Color and exposure applied to the map. */
    tint: [number, number, number];
    /** Caps pixels drawn: the Sun's glow needs no retina detail. */
    maxPixelRatio: number;
    /** Draw every Nth frame: its plasma moves slowly. */
    frameStep: number;
}

const LOOKS: Record<GlobeBody, Look> = {
    Sol: {
        mode: 1,
        radius: 0.5,
        tilt: 0.1,
        turn: 140,
        glow: [1, 0.6, 0.16],
        glowStrength: 1,
        ambient: 1,
        tint: [1, 1, 1],
        maxPixelRatio: 1,
        frameStep: 2,
    },
    Luna: {
        mode: 0,
        radius: 0.97,
        tilt: 0,
        turn: 0,
        glow: [0, 0, 0],
        glowStrength: 0,
        // Earthshine: the dark side still shows, faintly.
        ambient: 0.06,
        tint: [1.6, 1.58, 1.52],
        maxPixelRatio: 2,
        frameStep: 1,
    },
    Marte: {
        mode: 0,
        radius: 0.88,
        tilt: 0.42,
        turn: 60,
        glow: [1, 0.55, 0.35],
        glowStrength: 0.55,
        ambient: 0.05,
        // The red planet: Viking's colors run a little beige.
        tint: [1.18, 0.9, 0.74],
        maxPixelRatio: 2,
        frameStep: 1,
    },
    Venus: {
        mode: 2,
        radius: 0.88,
        tilt: 0.05,
        turn: 0,
        glow: [1, 0.88, 0.62],
        glowStrength: 0.7,
        ambient: 0.06,
        tint: [1, 1, 1],
        maxPixelRatio: 2,
        frameStep: 1,
    },
};

/** Planets lit from the upper left, the way they're usually pictured. */
const SUNLIGHT: [number, number, number] = [-0.55, 0.32, 0.77];

/** How much of its canvas a body's sphere spans (the rest: corona, air). */
export function sphereShare(body: GlobeBody): number {
    return LOOKS[body].radius;
}

const VERTEX = `
attribute vec2 aPos;
varying vec2 vP;
void main() { vP = aPos; gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAGMENT = `
#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif
precision highp float;
varying vec2 vP;
uniform vec2 uRes;
uniform float uTime;
uniform float uSpin;
uniform float uTilt;
uniform float uR;
uniform vec3 uLight;
uniform float uAmbient;
uniform int uMode;
uniform sampler2D uTex;
uniform float uHasTex;
uniform vec3 uGlow;
uniform float uGlowStrength;
uniform float uFlip;
uniform vec3 uTint;

float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
        mix(mix(hash(i), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
            mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
        mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
            mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
        f.z);
}
float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; }
    return v;
}
vec3 rotX(vec3 v, float a) { float c = cos(a); float s = sin(a); return vec3(v.x, c * v.y - s * v.z, s * v.y + c * v.z); }
vec3 rotY(vec3 v, float a) { float c = cos(a); float s = sin(a); return vec3(c * v.x + s * v.z, v.y, -s * v.x + c * v.z); }

void main() {
    vec2 p = vP / uR;
    float r = length(p);
    float px = 2.0 / (uRes.y * uR);
    float disc = 1.0 - smoothstep(1.0 - px, 1.0 + px, r);
    vec3 col = vec3(0.0);
    vec3 L = normalize(uLight);

    if (r < 1.0 + px) {
        float z = sqrt(max(0.0, 1.0 - min(r * r, 1.0)));
        vec3 n = vec3(p, z);
        // The surface turned as seen from the south (the Moon "upside
        // down"); the light stays where it is on screen.
        vec3 q = rotY(rotX(vec3(p * uFlip, z), uTilt), uSpin);
        float lon = atan(q.x, q.z);
        float lat = asin(clamp(q.y, -1.0, 1.0));

        if (uMode == 1) {
            // The Sun: plasma that flows (warped noise), bright filaments
            // where it folds, a hot cream core and a glowing white rim.
            float t = uTime;
            vec3 w = q * 2.6;
            vec3 warp = vec3(
                fbm(w + vec3(t * 0.12, 0.0, 0.0)),
                fbm(w + vec3(5.2, 1.3, t * 0.1)),
                fbm(w + vec3(2.1, 7.7, -t * 0.12)));
            float base = fbm(q * 3.5 + warp * 1.8);
            float fine = fbm(q * 16.0 + warp * 0.9 + vec3(0.0, t * 0.25, 0.0));
            float fold = 1.0 - abs(fbm(q * 5.0 + warp * 2.4 + vec3(t * 0.09)) * 2.0 - 1.0);
            float filaments = pow(fold, 7.0);
            float heat = base * 0.62 + fine * 0.38;
            col = mix(vec3(0.98, 0.42, 0.04), vec3(1.0, 0.72, 0.22), smoothstep(0.32, 0.6, heat));
            col = mix(col, vec3(1.0, 0.95, 0.78), smoothstep(0.52, 0.78, heat));
            col += vec3(1.0, 0.96, 0.82) * filaments * 0.85;
            col *= 0.78 + 0.3 * pow(z, 0.35);
            col += vec3(1.0, 0.86, 0.55) * pow(1.0 - z, 2.5) * 0.7;
        } else {
            vec3 albedo;
            if (uMode == 2) {
                // Venus: a world of cream clouds in slow bands.
                float swirl = fbm(vec3(lon * 1.6 + uTime * 0.012, lat * 6.0, 0.0) + fbm(q * 3.0) * 1.8);
                float bands = 0.5 + 0.5 * sin(lat * 8.0 + swirl * 5.0);
                albedo = mix(vec3(0.78, 0.62, 0.38), vec3(1.0, 0.95, 0.84), swirl * 0.75 + bands * 0.25);
            } else {
                float u = lon / 6.2831853 + 0.5;
                #ifdef GL_OES_standard_derivatives
                // Avoids a seam where longitude wraps (mipmaps pick by slope).
                float u2 = fract(u + 0.5) - 0.5;
                u = fwidth(u) < fwidth(u2) - 0.001 ? u : u2;
                #endif
                albedo = uHasTex > 0.5 ? texture2D(uTex, vec2(u, 0.5 - lat / 3.1415927)).rgb : vec3(0.45);
                albedo = pow(albedo, vec3(1.15)) * uTint;
            }
            float d = dot(n, L);
            float diffuse = smoothstep(-0.06, 0.22, d) * (0.3 + 0.7 * max(d, 0.0));
            col = albedo * (uAmbient + (1.0 - uAmbient) * diffuse);
            // Atmosphere: a lit rim where the light grazes it.
            col += uGlow * pow(1.0 - z, 2.6) * uGlowStrength * smoothstep(-0.25, 0.45, d);
        }
    }

    // Outside the disc: the Sun's corona and flames, a planet's atmosphere.
    float outside = max(r - 1.0, 0.0);
    vec2 dir = normalize(p + vec2(1e-5));
    float halo;
    vec3 haloColor = uGlow;
    if (uMode == 1) {
        // Turbulence drifting outward (noise on the direction, so no seam),
        // tongues of fire licking off the rim, yellow fading to deep red.
        // Flames rise and flicker: the noise flows outward (radius minus
        // time) and the whole crown turns slowly.
        float a = uTime * 0.04;
        vec2 swirl = vec2(dir.x * cos(a) - dir.y * sin(a), dir.x * sin(a) + dir.y * cos(a));
        vec3 fp = vec3(swirl * 1.8, outside * 2.6 - uTime * 0.45);
        float turbulence = fbm(fp * 2.2 + fbm(fp * 3.1 + vec3(0.0, 0.0, uTime * 0.2)) * 1.4);
        float tongue = 1.0 - abs(fbm(vec3(swirl * 3.4, outside * 5.0 - uTime * 1.1)) * 2.0 - 1.0);
        float flames = pow(tongue, 5.0);
        halo = exp(-outside * 2.6) * (0.35 + 0.9 * turbulence) + exp(-outside * 7.0) * flames * 1.6;
        haloColor = mix(vec3(0.85, 0.16, 0.02), vec3(1.0, 0.8, 0.35), exp(-outside * 4.0));
    } else {
        float litSide = clamp(dot(dir, normalize(L.xy + vec2(1e-5))) * 0.5 + 0.6, 0.0, 1.0);
        halo = exp(-outside * 26.0) * uGlowStrength * 0.7 * litSide;
    }
    // Fades well before the canvas edge, so no square shows.
    float edge = uMode == 1 ? 0.6 : 0.82;
    halo = min(halo * (1.0 - disc) * (1.0 - smoothstep(edge, 1.0, length(vP))), 1.0);
    gl_FragColor = vec4(col * disc + haloColor * halo, clamp(disc + halo, 0.0, 1.0));
}
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

/** Moon light from the lunar month: lit on the left while waxing (south). */
function moonLight(phase: number): [number, number, number] {
    const angle = phase * 2 * Math.PI;
    return [-Math.sin(angle), 0, -Math.cos(angle)];
}

/**
 * A real-looking body: a sphere drawn in WebGL that turns, with NASA's map
 * of its surface, lit like a planet (or burning, for the Sun). `phase` lights
 * the Moon as on that night. Without WebGL it shows `fallback`.
 */
export function Globe({
    body,
    phase,
    light,
    paused = false,
    className,
    style,
    fallback,
}: {
    body: GlobeBody;
    /** The Moon's place in its month, 0–1 (0 new, 0.5 full). */
    phase?: number;
    /**
     * Where its light comes from (x right, y up, z toward us), instead of
     * the upper left: a globe taking over from the solar system is lit by
     * where the Sun really was.
     */
    light?: readonly [number, number, number];
    /**
     * Drawn once and shown as a still picture: one mounted ahead to take
     * over a moving dot costs nothing to load, scale or move until then.
     */
    paused?: boolean;
    className?: string;
    style?: CSSProperties;
    fallback?: ReactNode;
}) {
    const hostRef = useRef<HTMLDivElement>(null);
    const phaseRef = useRef(phase);
    phaseRef.current = phase;
    const lightRef = useRef(light);
    lightRef.current = light;
    const pausedRef = useRef(paused);
    pausedRef.current = paused;
    const runRef = useRef<(() => void) | null>(null);
    const stillRef = useRef<(() => void) | null>(null);

    // Live when it plays; a picture of its last frame while paused.
    useEffect(() => {
        if (paused) stillRef.current?.();
        else runRef.current?.();
    }, [paused]);
    const drawRef = useRef<(() => void) | null>(null);
    const reducedMotion = useReducedMotion();
    const [failed, setFailed] = useState(false);

    // A still frame (reduced motion) still follows the Moon's phase.
    useEffect(() => {
        if (reducedMotion && phase !== undefined) drawRef.current?.();
    }, [phase, reducedMotion]);

    useEffect(() => {
        const host = hostRef.current;
        if (!host) return;
        // A fresh canvas per mount: a context freed on unmount can't be
        // taken back, and React may mount the same element twice.
        const canvas = document.createElement("canvas");
        canvas.className = "block size-full";
        host.appendChild(canvas);
        // A still picture of the last frame: an image is free to scale
        // and move, a live WebGL canvas is not (on weaker phones).
        const picture = document.createElement("img");
        picture.className = "block size-full";
        picture.alt = "";
        picture.style.display = "none";
        host.appendChild(picture);
        // Until a frame is drawn into it, the picture is an empty image
        // (a broken-image box, on some browsers): the canvas stands in.
        let pictured = false;
        const showLive = (live: boolean) => {
            const still = !live && pictured;
            canvas.style.display = still ? "none" : "";
            picture.style.display = still ? "" : "none";
        };
        const coarse = window.matchMedia("(pointer: coarse)").matches;
        const gl = canvas.getContext("webgl", {
            premultipliedAlpha: true,
            // A phone's GPU has better things to do than smooth this sphere.
            antialias: !coarse,
        });
        if (!gl) {
            canvas.remove();
            setFailed(true);
            return;
        }
        const derivatives = gl.getExtension("OES_standard_derivatives");
        const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
        const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
        const program = gl.createProgram();
        if (!vs || !fs || !program) {
            canvas.remove();
            setFailed(true);
            return;
        }
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            canvas.remove();
            setFailed(true);
            return;
        }
        // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
        gl.useProgram(program);

        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
            gl.STATIC_DRAW,
        );
        const aPos = gl.getAttribLocation(program, "aPos");
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

        const at = (name: string) => gl.getUniformLocation(program, name);
        const look = LOOKS[body];
        gl.uniform1f(at("uR"), look.radius);
        gl.uniform1f(at("uTilt"), look.tilt);
        gl.uniform1i(at("uMode"), look.mode);
        gl.uniform3fv(at("uGlow"), look.glow);
        gl.uniform1f(at("uGlowStrength"), look.glowStrength);
        gl.uniform1f(at("uAmbient"), look.ambient);
        gl.uniform3fv(at("uTint"), look.tint);
        gl.uniform1f(at("uHasTex"), 0);
        // Peru sees the Moon turned half a circle from the usual pictures.
        gl.uniform1f(at("uFlip"), body === "Luna" ? -1 : 1);
        gl.uniform1i(at("uTex"), 0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        let disposed = false;
        let frame = 0;
        let running = false;
        // Its own clock, running only while it's live: the still picture
        // shown before and the first frame after are the same moment (the
        // Sun's flames, a turning planet), so taking over shows no cut.
        let clock = 0;
        let liveSince = 0;
        const elapsed = () =>
            running ? clock + (performance.now() - liveSince) / 1000 : clock;
        const stop = () => {
            clock = elapsed();
            running = false;
            cancelAnimationFrame(frame);
        };

        /** Sized by its host: the canvas has no size while a still shows. */
        const resize = () => {
            const ratio = Math.min(
                window.devicePixelRatio || 1,
                coarse ? 1.5 : look.maxPixelRatio,
            );
            const width = Math.round(host.clientWidth * ratio);
            const height = Math.round(host.clientHeight * ratio);
            if (!width || !height) return false;
            if (canvas.width !== width || canvas.height !== height) {
                canvas.width = width;
                canvas.height = height;
            }
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.uniform2f(at("uRes"), canvas.width, canvas.height);
            return true;
        };

        const draw = () => {
            // Not laid out yet: the last frame stays.
            if (disposed || !resize()) return;
            const t = reducedMotion ? 0 : elapsed();
            // The Moon shows one face; it only sways a little (libration).
            const spin = look.turn
                ? (t * 2 * Math.PI) / look.turn
                : body === "Luna"
                  ? 0.07 * Math.sin(t * 0.25)
                  : 0;
            gl.uniform1f(at("uTime"), t);
            gl.uniform1f(at("uSpin"), spin);
            gl.uniform3fv(
                at("uLight"),
                body === "Luna"
                    ? moonLight(phaseRef.current ?? 0.5)
                    : (lightRef.current ?? SUNLIGHT),
            );
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            // Read in the same task as the draw: the buffer is still there.
            if (pausedRef.current) {
                picture.src = canvas.toDataURL();
                pictured = true;
                showLive(false);
            }
        };
        drawRef.current = draw;

        let tick = 0;
        const loop = () => {
            if (pausedRef.current) {
                stop();
                return;
            }
            // A big Sun (the sunrise) skips frames; a small one moves at 60.
            // Phones settle for 30 fps: the bodies turn slowly enough.
            const step = coarse
                ? Math.max(look.frameStep, 2)
                : canvas.width * canvas.height > 300_000
                  ? look.frameStep
                  : 1;
            if (tick++ % step === 0) draw();
            frame = requestAnimationFrame(loop);
        };
        const run = () => {
            showLive(true);
            if (running || disposed || reducedMotion) return;
            running = true;
            liveSince = performance.now();
            frame = requestAnimationFrame(loop);
        };
        runRef.current = run;
        stillRef.current = () => {
            stop();
            draw();
            showLive(false);
        };

        const source = TEXTURES[body];
        if (source) {
            const image = new Image();
            image.onload = () => {
                if (disposed) return;
                const texture = gl.createTexture();
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(
                    gl.TEXTURE_2D,
                    0,
                    gl.RGB,
                    gl.RGB,
                    gl.UNSIGNED_BYTE,
                    image,
                );
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                gl.texParameteri(
                    gl.TEXTURE_2D,
                    gl.TEXTURE_WRAP_T,
                    gl.CLAMP_TO_EDGE,
                );
                gl.texParameteri(
                    gl.TEXTURE_2D,
                    gl.TEXTURE_MAG_FILTER,
                    gl.LINEAR,
                );
                if (derivatives) {
                    gl.generateMipmap(gl.TEXTURE_2D);
                    gl.texParameteri(
                        gl.TEXTURE_2D,
                        gl.TEXTURE_MIN_FILTER,
                        gl.LINEAR_MIPMAP_LINEAR,
                    );
                } else
                    gl.texParameteri(
                        gl.TEXTURE_2D,
                        gl.TEXTURE_MIN_FILTER,
                        gl.LINEAR,
                    );
                gl.uniform1f(at("uHasTex"), 1);
                // Ready even while paused: the map is on before it shows.
                draw();
            };
            image.src = source;
        }

        draw();
        if (pausedRef.current) showLive(false);
        else run();

        return () => {
            disposed = true;
            drawRef.current = null;
            runRef.current = null;
            stillRef.current = null;
            cancelAnimationFrame(frame);
            // Scenes come and go: free the context instead of piling them up.
            gl.getExtension("WEBGL_lose_context")?.loseContext();
            canvas.remove();
            picture.remove();
        };
    }, [body, reducedMotion]);

    if (failed && fallback) return <>{fallback}</>;
    return <div ref={hostRef} className={className} style={style} />;
}
