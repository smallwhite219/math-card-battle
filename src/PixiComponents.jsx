import React, { useState, useRef } from 'react';
import { Stage, Sprite, useTick } from '@pixi/react';

const FloatingSprite = ({ image, isTakingDamage, isAttacking }) => {
    const [yOffset, setYOffset] = useState(0);
    const [xOffset, setXOffset] = useState(0);
    const [tint, setTint] = useState(0xFFFFFF);

    let time = useRef(0);

    useTick((delta) => {
        time.current += delta * 0.05;

        // Idle float
        let newY = Math.sin(time.current) * 4;
        let newX = 0;

        // Damage shake
        if (isTakingDamage) {
            newX = (Math.random() - 0.5) * 15;
            newY += (Math.random() - 0.5) * 15;
            setTint(0xFF8888); // Red tint
        }
        // Attacking dash
        else if (isAttacking) {
            newX = 20;
            setTint(0xFFFFFF);
        } else {
            setTint(0xFFFFFF);
        }

        setYOffset(newY);
        setXOffset(newX);
    });

    return (
        <Sprite
            image={image}
            anchor={0.5}
            x={64 + xOffset}
            y={64 + yOffset}
            width={128}
            height={128}
            tint={tint}
        />
    );
};

export const HeroPortrait = ({ isTakingDamage, isAttacking }) => {
    return (
        <Stage width={128} height={128} options={{ backgroundAlpha: 0 }} className="portrait hero" style={{ padding: 0, imageRendering: 'pixelated' }}>
            <FloatingSprite
                image={`${import.meta.env.BASE_URL}pixel_hero.png`}
                isTakingDamage={isTakingDamage}
                isAttacking={isAttacking}
            />
        </Stage>
    );
};

const InnerDragonSprite = ({ isTakingDamage, dragonClass }) => {
    // Let dragon class dictate default tint
    let defaultTint = 0xFFFFFF;
    if (dragonClass === 'dragon-fire') defaultTint = 0xFF8844;
    if (dragonClass === 'dragon-ice') defaultTint = 0x88EEFF;
    if (dragonClass === 'dragon-dark') defaultTint = 0x8844FF;

    const [yOffset, setYOffset] = useState(0);
    const [xOffset, setXOffset] = useState(0);
    const [tint, setTint] = useState(defaultTint);

    let time = useRef(0);

    useTick((delta) => {
        time.current += delta * 0.03;

        // Idle float is slower and heavier
        let newY = Math.sin(time.current) * 6;
        let newX = 0;

        if (isTakingDamage) {
            newX = (Math.random() - 0.5) * 20;
            newY += (Math.random() - 0.5) * 20;
            setTint(0xFFFFFF); // Flash white/red on hit
        } else {
            setTint(defaultTint);
        }

        setYOffset(newY);
        setXOffset(newX);
    });

    return (
        <Sprite
            image={`${import.meta.env.BASE_URL}pixel_dragon.png`}
            anchor={0.5}
            x={64 + xOffset}
            y={64 + yOffset}
            width={128}
            height={128}
            tint={tint}
        />
    );
};

export const DragonPortrait = ({ isTakingDamage, dragonClass }) => {
    return (
        <Stage width={128} height={128} options={{ backgroundAlpha: 0 }} className={`portrait ${dragonClass}`} style={{ padding: 0, imageRendering: 'pixelated' }}>
            <InnerDragonSprite isTakingDamage={isTakingDamage} dragonClass={dragonClass} />
        </Stage>
    );
};
