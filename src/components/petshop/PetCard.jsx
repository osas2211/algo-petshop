import React from "react";
import PropTypes from "prop-types";
import { Button, Card, Col, Stack, Badge } from "react-bootstrap";
import { truncateAddress } from "../../utils/conversions";
import Identicon from "../utils/Identicon";

const PetCard = ({ address, pet, adoptPet, deletePet }) => {
  const {
    appId,
    name,
    image,
    age,
    breed,
    location,
    adopted,
    owner,
    appCreator,
  } = pet;

  const isAdopted = () => adopted === 1;

  const hasAccess = () => address === owner || address === appCreator;

  return (
    <Col key={appId}>
      <Card className="h-100">
        <Card.Header>
          <Stack direction="horizontal" gap={2}>
            <Identicon size={28} address={owner} />
            <span className="font-monospace text-secondary">
              Owner:{" "}
              <a
                href={`https://testnet.algoexplorer.io/address/${owner}`}
                target="_blank"
                rel="noreferrer"
              >
                {truncateAddress(owner)}
              </a>
            </span>
            <Badge bg="secondary" className="ms-auto">
              {!isAdopted()
                ? "AVAILABLE"
                : "NOT AVAILABLE"
                }
            </Badge>
          </Stack>
        </Card.Header>
        <div className="ratio ratio-4x3">
          <img src={image} alt={name} style={{ objectFit: "cover" }} />
        </div>
        <Card.Body className="d-flex flex-column text-center">
          <Card.Title>{name}</Card.Title>
          <Card.Text className="flex-grow-1">
            <strong>Breed</strong>: {breed}
          </Card.Text>
          <Card.Text className="flex-grow-1">
            <i className="bi bi-calendar"></i> <strong>Age</strong>: {age}
          </Card.Text>
          <Card.Text className="flex-grow-1">
            <i className="bi bi-geo-alt"></i> <strong>Location</strong>:{" "}
            {location}
          </Card.Text>
          <div className="d-flex justify-content-between">
            <Button
              variant="outline-dark"
              onClick={() => adoptPet(pet)}
              className="w-75 py-3"
              disabled={isAdopted()}
            >
              {isAdopted() ? "Adopted" : `Adopt ${name}`}
            </Button>

            <Button
              variant="outline-danger"
              onClick={() => deletePet(pet)}
              className="btn"
              disabled={!hasAccess()}
            >
              <i className="bi bi-trash"></i>
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Col>
  );
};

PetCard.propTypes = {
  address: PropTypes.string.isRequired,
  pet: PropTypes.instanceOf(Object).isRequired,
  adoptPet: PropTypes.func.isRequired,
  deletePet: PropTypes.func.isRequired,
};

export default PetCard;
