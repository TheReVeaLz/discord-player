import { firaCode, inter } from '@/lib/constants';
import { Badge, Heading, Paragraph } from '@edge-ui/react';
import type { DocumentedTypes } from 'typedoc-nextra';
import { EntitySymbol } from '../doc/EntitySymbol';
import { ParameterTable } from '../doc/ParameterTable';
import { Properties } from '../doc/Properties';

export function TypeRenderer({ entity }: { entity: DocumentedTypes }) {
    return (
        <>
            <EntitySymbol type={'interface'} id={`c-${entity.name}`} link source={entity.metadata?.url}>
                {entity.name}
            </EntitySymbol>
            {entity.description ? (
                <Paragraph>
                    <pre className={inter.className}>{entity.description}</pre>
                </Paragraph>
            ) : null}
            {entity.properties.length ? (
                <div className="flex flex-col gap-4 mt-5">
                    <Heading.H3>Properties</Heading.H3>
                    {entity.properties.map((property) => (
                        <Properties entity={property} key={property.name} />
                    ))}
                </div>
            ) : null}
            <ParameterTable parameters={entity.parameters} />
            {!entity.properties.length && entity.type ? (
                <div className="my-2">
                    Type: <Badge variant="outline">{entity.type}</Badge>
                </div>
            ) : null}
        </>
    );
}
