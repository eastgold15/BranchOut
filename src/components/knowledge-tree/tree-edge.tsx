"use client";

import { Line } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

interface TreeEdgeProps {
	color?: string;
	from: [number, number, number];
	to: [number, number, number];
}

export function TreeEdge({ from, to, color = "#475569" }: TreeEdgeProps) {
	const points = useMemo(
		() => [new THREE.Vector3(...from), new THREE.Vector3(...to)],
		[from, to],
	);

	return (
		<Line
			color={color}
			lineWidth={2}
			opacity={0.6}
			points={points}
			transparent
		/>
	);
}
