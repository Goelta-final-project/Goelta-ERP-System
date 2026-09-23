import type {ReactNode} from "react";
import {Icon} from "../../ui";

export function Empty({
                          title,
                          description,
                          action,
                      }: {
    title: string;
    description: string;
    action?: ReactNode;
}) {
    return (
        <div className="empty">
            <div className="empty-icon">
                <Icon name="file" size={30} />
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
            {action}
        </div>
    );
}